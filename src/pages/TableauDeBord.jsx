import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageTitle from "@/components/PageTitle";
import { STATUTS_COMPTE, STATUT_COULEUR } from "@/lib/crm-constants";
import {
  AlertTriangle, CalendarCheck, PhoneOff, Wrench, Phone, Video,
  Building2, TrendingUp, Star, Route, CheckCircle2, Sparkles,
} from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, addDays, addMonths, format } from "date-fns";
import { fr } from "date-fns/locale";

const GD_BLUE = "#01377D";
const GD_YELLOW = "#FEB800";
const GD_GREEN = "#10b981";
const GD_MIST = "#CAD6E4";

const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);

export default function TableauDeBord() {
  const [k, setK] = useState(null);
  const [repartition, setRepartition] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyseIA, setAnalyseIA] = useState(null);
  const [analyseLoading, setAnalyseLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const today = new Date();
        const todayStr = format(today, "yyyy-MM-dd");
        const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
        const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
        const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
        const monthStartIso = format(startOfMonth(today), "yyyy-MM-dd'T'HH:mm:ss");
        const sevenDaysAgo = format(addDays(today, -7), "yyyy-MM-dd'T'HH:mm:ss");
        const in12Months = format(addMonths(today, 12), "yyyy-MM-dd");

        const [
          totalComptes,
          clientsCount,
          potentielACount,
          scoreEleveCount,
          jamaisContactes,
          equipementsARenouveler,
          tachesRetard,
          statutCounts,
          sansStatut,
          contactesMois,
          appelsMois,
          visitesMois,
          rdvPrisMois,
          oppsCreesMois,
          appels7j,
          visites7j,
          rdvPris7j,
          rdvVisites,
          rdvDemos,
          contactesSemaine,
        ] = await Promise.all([
          base44.entities.Compte.count({}),
          base44.entities.Compte.count({ statut: "Client" }),
          base44.entities.Compte.count({ potentiel: "A" }),
          base44.entities.Compte.count({ score: { $gte: 70 } }),
          base44.entities.Compte.count({ date_dernier_contact: { $exists: false } }),
          base44.entities.Equipement.count({ date_renouvellement_estimee: { $gte: todayStr, $lte: in12Months } }),
          base44.entities.Tache.count({ statut: "À faire", echeance: { $lt: todayStr } }),
          Promise.all(STATUTS_COMPTE.map((s) => base44.entities.Compte.count({ statut: s }))),
          base44.entities.Compte.count({ statut: { $exists: false } }),
          base44.entities.Compte.count({ date_dernier_contact: { $gte: monthStart } }),
          base44.entities.Interaction.count({ type: "Appel", date_heure: { $gte: monthStartIso } }),
          base44.entities.Interaction.count({ type: "Visite", date_heure: { $gte: monthStartIso } }),
          base44.entities.Interaction.count({ resultat: "RDV pris", date_heure: { $gte: monthStartIso } }),
          base44.entities.Opportunite.count({ created_date: { $gte: monthStartIso } }),
          base44.entities.Interaction.count({ type: "Appel", date_heure: { $gte: sevenDaysAgo } }),
          base44.entities.Interaction.count({ type: "Visite", date_heure: { $gte: sevenDaysAgo } }),
          base44.entities.Interaction.count({ resultat: "RDV pris", date_heure: { $gte: sevenDaysAgo } }),
          base44.entities.Tache.count({ statut: "À faire", type: "Visite", echeance: { $gte: weekStart, $lte: weekEnd } }),
          base44.entities.Tache.count({ statut: "À faire", type: "Démo", echeance: { $gte: weekStart, $lte: weekEnd } }),
          base44.entities.Compte.count({ date_dernier_contact: { $gte: weekStart } }),
        ]);

        setK({
          totalComptes, clientsCount, potentielACount, scoreEleveCount,
          jamaisContactes, equipementsARenouveler, tachesRetard,
          contactesMois, appelsMois, visitesMois, rdvPrisMois, oppsCreesMois,
          appels7j, visites7j, rdvPris7j, rdvSemaine: rdvVisites + rdvDemos, contactesSemaine,
        });

        const rep = STATUTS_COMPTE.map((s, i) => ({ statut: s, count: statutCounts[i] }));
        rep[0].count += sansStatut; // clients sans statut = "À qualifier" par défaut
        setRepartition(rep);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!k) return;
    const activite = (k.appelsMois || 0) + (k.visitesMois || 0) + (k.rdvPrisMois || 0) + (k.contactesMois || 0);
    if (activite === 0) return; // pas encore de premiers mouvements : rien à analyser

    const cacheKey = `gd-analyse-ia-${format(new Date(), "yyyy-MM-dd")}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setAnalyseIA(cached);
      return;
    }

    setAnalyseLoading(true);
    base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un assistant pour une équipe commerciale de prospection (vente de matériel agricole et d'espaces verts, zone Charente/Deux-Sèvres/Vienne, concessionnaire New Holland).

Voici les indicateurs actuels du tableau de bord :
- Portefeuille : ${k.totalComptes} clients au total, ${k.clientsCount} déjà clients, ${k.jamaisContactes} jamais contactés, ${k.tachesRetard} tâches en retard, ${k.equipementsARenouveler} équipements à renouveler sous 12 mois
- Ce mois-ci : ${k.appelsMois} appels, ${k.visitesMois} visites, ${k.rdvPrisMois} RDV pris, ${k.oppsCreesMois} opportunités ouvertes, ${k.contactesMois} clients contactés
- Cette semaine : ${k.appels7j} appels, ${k.visites7j} visites, ${k.rdvPris7j} RDV pris

Rédige une analyse courte (2 à 3 phrases maximum), en français, factuelle et actionnable : souligne ce qui va bien si pertinent, et signale au maximum un seul point d'attention prioritaire (ex. tâches en retard, clients jamais contactés). Pas de généralités, pas de formules creuses.`,
      response_json_schema: {
        type: "object",
        properties: { analyse: { type: "string" } },
        required: ["analyse"],
      },
    })
      .then((res) => {
        const text = typeof res === "object" && res?.analyse ? res.analyse : typeof res === "string" ? res : null;
        if (text) {
          setAnalyseIA(text);
          localStorage.setItem(cacheKey, text);
        }
      })
      .catch((e) => console.error("[analyseIA]", e))
      .finally(() => setAnalyseLoading(false));
  }, [k]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gd-mist border-t-gd-blue" />
      </div>
    );
  }

  const today = new Date();
  const maxRepartition = Math.max(1, ...repartition.map((r) => r.count));

  return (
    <div className="animate-fade-in">
      <PageTitle subtitle={`${k.totalComptes || 0} clients en portefeuille · Zone 16, 79, 86`}>Tableau de bord</PageTitle>

      <div className="space-y-8 p-4 lg:p-8">
        {(analyseLoading || analyseIA) && (
          <div className="rounded-xl border border-gd-yellow/30 bg-gd-yellow/5 p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gd-yellow" />
              <div className="min-w-0 flex-1">
                <div className="mb-1 text-xs font-semibold text-gd-navy">Analyse IA</div>
                {analyseLoading ? (
                  <p className="text-sm text-muted-foreground">Génération de l'analyse…</p>
                ) : (
                  <p className="text-sm text-foreground/80">{analyseIA}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────── GLOBAL ───────────────────── */}
        <DashboardSection title="Vue d'ensemble" subtitle="Portefeuille global">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
            <RingStat pct={pct(k.clientsCount, k.totalComptes)} color={GD_BLUE} label="Taux de conversion" />
            <RingStat pct={pct(k.potentielACount, k.totalComptes)} color={GD_YELLOW} label="Potentiel A" />
            <RingStat pct={pct(k.scoreEleveCount, k.totalComptes)} color={GD_GREEN} label="Score ≥ 70" />
            <StatTile icon={Building2} label="Clients" value={k.totalComptes} />
            <StatTile icon={PhoneOff} label="Jamais contactés" value={k.jamaisContactes} />
            <StatTile icon={Wrench} label="Équip. à renouveler" value={k.equipementsARenouveler} sub="sous 12 mois" />
            <StatTile icon={AlertTriangle} label="Tâches en retard" value={k.tachesRetard} accent={k.tachesRetard > 0 ? "danger" : undefined} />
          </div>

          <div className="mt-4 rounded-xl border border-gd-mist/50 bg-white p-5 gd-hatch">
            <h3 className="gd-title mb-4 text-sm text-gd-blue">Répartition des clients par statut</h3>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {repartition.map((r) => (
                <RepartitionRow key={r.statut} statut={r.statut} count={r.count} max={maxRepartition} />
              ))}
            </div>
          </div>
        </DashboardSection>

        {/* ───────────────────── MENSUEL ───────────────────── */}
        <DashboardSection title="Ce mois-ci" subtitle={capitalize(format(today, "MMMM yyyy", { locale: fr }))}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <RingStat pct={pct(k.contactesMois, k.totalComptes)} color={GD_BLUE} label="Clients contactés ce mois" />
            <StatTile icon={Phone} label="Appels" value={k.appelsMois} />
            <StatTile icon={Video} label="Visites" value={k.visitesMois} />
            <StatTile icon={CalendarCheck} label="RDV pris" value={k.rdvPrisMois} />
            <StatTile icon={TrendingUp} label="Opportunités ouvertes" value={k.oppsCreesMois} />
          </div>
        </DashboardSection>

        {/* ───────────────────── HEBDOMADAIRE ───────────────────── */}
        <DashboardSection
          title="Cette semaine"
          subtitle={`Semaine du ${format(startOfWeek(today, { weekStartsOn: 1 }), "d")} au ${format(endOfWeek(today, { weekStartsOn: 1 }), "d MMMM", { locale: fr })}`}
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatTile icon={Phone} label="Appels" value={k.appels7j} />
            <StatTile icon={Video} label="Visites" value={k.visites7j} />
            <StatTile icon={CheckCircle2} label="RDV pris" value={k.rdvPris7j} />
            <StatTile icon={Route} label="RDV planifiés" value={k.rdvSemaine} />
            <StatTile icon={Star} label="Clients contactés" value={k.contactesSemaine} />
          </div>
        </DashboardSection>
      </div>
    </div>
  );
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function DashboardSection({ title, subtitle, children }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2.5 border-b border-gd-mist/40 pb-2">
        <h2 className="gd-title text-base text-gd-blue">{title}</h2>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

function RingStat({ pct: value, color, label, size = 92, stroke = 9 }) {
  const clamped = Math.min(100, Math.max(0, value || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-gd-mist/50 bg-white p-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={GD_MIST} strokeWidth={stroke} opacity={0.5} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-extrabold text-foreground">{clamped}%</span>
        </div>
      </div>
      <span className="text-center text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, sub, accent }) {
  const accentClass = accent === "danger" ? "bg-gd-danger text-white" : "bg-gd-blue text-white";
  return (
    <div className="gd-hatch rounded-xl border border-gd-mist/50 bg-white p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="gd-tabular mt-3 text-2xl font-extrabold text-foreground">{value ?? 0}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground/70">{sub}</div>}
    </div>
  );
}

function RepartitionRow({ statut, count, max }) {
  const c = STATUT_COULEUR[statut] || STATUT_COULEUR["À qualifier"];
  const p = Math.round((count / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{statut}</span>
        <span className="gd-tabular font-semibold">{count}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-gd-ice">
        <div className={`h-full rounded-full ${c.dot}`} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}
