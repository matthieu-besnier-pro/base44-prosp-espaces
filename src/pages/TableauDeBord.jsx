import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageTitle from "@/components/PageTitle";
import { STATUTS_COMPTE, STATUT_COULEUR } from "@/lib/crm-constants";
import {
  AlertTriangle, CalendarCheck, PhoneOff, Wrench, Phone, Video,
  Building2, TrendingUp, Star, Sparkles, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subDays, subWeeks, subMonths, addMonths, format,
} from "date-fns";
import { fr } from "date-fns/locale";

const GD_BLUE = "#01377D";
const GD_YELLOW = "#FEB800";
const GD_GREEN = "#10b981";
const GD_MIST = "#CAD6E4";

const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);

const PERIODES = [
  { cle: "jour", label: "Jour" },
  { cle: "semaine", label: "Hebdo" },
  { cle: "mois", label: "Mois" },
  { cle: "tout", label: "Tout" },
];

// Compte les 4 indicateurs d'activité pour une fenêtre temporelle donnée.
const compterActivite = (debutIso, finIso, debutDate, finDate) =>
  Promise.all([
    base44.entities.Interaction.count({ type: "Appel", date_heure: { $gte: debutIso, $lte: finIso } }),
    base44.entities.Interaction.count({ type: "Visite", date_heure: { $gte: debutIso, $lte: finIso } }),
    base44.entities.Interaction.count({ resultat: "RDV pris", date_heure: { $gte: debutIso, $lte: finIso } }),
    base44.entities.Compte.count({ date_dernier_contact: { $gte: debutDate, $lte: finDate } }),
  ]).then(([appels, visites, rdvPris, contactes]) => ({ appels, visites, rdvPris, contactes }));

export default function TableauDeBord() {
  const [k, setK] = useState(null);
  const [activite, setActivite] = useState(null);
  const [repartition, setRepartition] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodMode, setPeriodMode] = useState("jour");
  const [analyseIA, setAnalyseIA] = useState(null);
  const [analyseLoading, setAnalyseLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const today = new Date();

        const jourDebut = startOfDay(today);
        const jourFin = endOfDay(today);
        const jourDebutIso = format(jourDebut, "yyyy-MM-dd'T'HH:mm:ss");
        const jourFinIso = format(jourFin, "yyyy-MM-dd'T'HH:mm:ss");
        const jourDate = format(today, "yyyy-MM-dd");

        const hier = subDays(today, 1);
        const hierDebutIso = format(startOfDay(hier), "yyyy-MM-dd'T'HH:mm:ss");
        const hierFinIso = format(endOfDay(hier), "yyyy-MM-dd'T'HH:mm:ss");
        const hierDate = format(hier, "yyyy-MM-dd");

        const semDebut = startOfWeek(today, { weekStartsOn: 1 });
        const semFin = endOfWeek(today, { weekStartsOn: 1 });
        const semDebutIso = format(semDebut, "yyyy-MM-dd'T'HH:mm:ss");
        const semFinIso = format(endOfDay(semFin), "yyyy-MM-dd'T'HH:mm:ss");
        const semDebutDate = format(semDebut, "yyyy-MM-dd");
        const semFinDate = format(semFin, "yyyy-MM-dd");

        const semPrevDebut = subWeeks(semDebut, 1);
        const semPrevFin = subWeeks(semFin, 1);
        const semPrevDebutIso = format(semPrevDebut, "yyyy-MM-dd'T'HH:mm:ss");
        const semPrevFinIso = format(endOfDay(semPrevFin), "yyyy-MM-dd'T'HH:mm:ss");
        const semPrevDebutDate = format(semPrevDebut, "yyyy-MM-dd");
        const semPrevFinDate = format(semPrevFin, "yyyy-MM-dd");

        const moisDebut = startOfMonth(today);
        const moisFin = endOfMonth(today);
        const moisDebutIso = format(moisDebut, "yyyy-MM-dd'T'HH:mm:ss");
        const moisFinIso = format(endOfDay(moisFin), "yyyy-MM-dd'T'HH:mm:ss");
        const moisDebutDate = format(moisDebut, "yyyy-MM-dd");
        const moisFinDate = format(moisFin, "yyyy-MM-dd");

        const moisPrevRef = subMonths(today, 1);
        const moisPrevDebut = startOfMonth(moisPrevRef);
        const moisPrevFin = endOfMonth(moisPrevRef);
        const moisPrevDebutIso = format(moisPrevDebut, "yyyy-MM-dd'T'HH:mm:ss");
        const moisPrevFinIso = format(endOfDay(moisPrevFin), "yyyy-MM-dd'T'HH:mm:ss");
        const moisPrevDebutDate = format(moisPrevDebut, "yyyy-MM-dd");
        const moisPrevFinDate = format(moisPrevFin, "yyyy-MM-dd");

        // Borne basse arbitraire pour "depuis toujours", pour ne pas dépendre d'un
        // $exists peu fiable sur cette base (cf. bug constaté sur le champ latitude).
        const depuisToujoursIso = "1900-01-01T00:00:00";
        const depuisToujoursDate = "1900-01-01";

        const in12Mois = format(addMonths(today, 12), "yyyy-MM-dd");

        const [
          jour, hierStats, semaine, semainePrev, mois, moisPrev, tout,
          totalComptes, clientsCount, potentielACount, scoreEleveCount, jamaisContactes,
          equipementsARenouveler, tachesRetard, statutCounts, sansStatut,
        ] = await Promise.all([
          compterActivite(jourDebutIso, jourFinIso, jourDate, jourDate),
          compterActivite(hierDebutIso, hierFinIso, hierDate, hierDate),
          compterActivite(semDebutIso, semFinIso, semDebutDate, semFinDate),
          compterActivite(semPrevDebutIso, semPrevFinIso, semPrevDebutDate, semPrevFinDate),
          compterActivite(moisDebutIso, moisFinIso, moisDebutDate, moisFinDate),
          compterActivite(moisPrevDebutIso, moisPrevFinIso, moisPrevDebutDate, moisPrevFinDate),
          compterActivite(depuisToujoursIso, jourFinIso, depuisToujoursDate, jourDate),
          base44.entities.Compte.count({}),
          base44.entities.Compte.count({ statut: "Client" }),
          base44.entities.Compte.count({ potentiel: "A" }),
          base44.entities.Compte.count({ score: { $gte: 70 } }),
          base44.entities.Compte.count({ date_dernier_contact: { $exists: false } }),
          base44.entities.Equipement.count({ date_renouvellement_estimee: { $gte: jourDate, $lte: in12Mois } }),
          base44.entities.Tache.count({ statut: "À faire", echeance: { $lt: jourDate } }),
          Promise.all(STATUTS_COMPTE.map((s) => base44.entities.Compte.count({ statut: s }))),
          base44.entities.Compte.count({ statut: { $exists: false } }),
        ]);

        setK({
          totalComptes, clientsCount, potentielACount, scoreEleveCount,
          jamaisContactes, equipementsARenouveler, tachesRetard,
        });

        setActivite({
          jour: { ...jour, prev: hierStats },
          semaine: { ...semaine, prev: semainePrev },
          mois: { ...mois, prev: moisPrev },
          tout: { ...tout, prev: null },
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
    if (!activite) return;
    const { mois, semaine } = activite;
    const activiteTotale = (mois.appels || 0) + (mois.visites || 0) + (mois.rdvPris || 0) + (mois.contactes || 0);
    if (activiteTotale === 0) return; // pas encore de premiers mouvements : rien à analyser

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
- Ce mois-ci : ${mois.appels} appels, ${mois.visites} visites, ${mois.rdvPris} RDV pris, ${mois.contactes} clients contactés
- Cette semaine : ${semaine.appels} appels, ${semaine.visites} visites, ${semaine.rdvPris} RDV pris

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activite]);

  if (loading || !k || !activite) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gd-mist border-t-gd-blue" />
      </div>
    );
  }

  const today = new Date();
  const maxRepartition = Math.max(1, ...repartition.map((r) => r.count));
  const actuel = activite[periodMode];
  const precedent = actuel.prev;

  const sousTitrePeriode = {
    jour: capitalize(format(today, "EEEE d MMMM", { locale: fr })),
    semaine: `Semaine du ${format(startOfWeek(today, { weekStartsOn: 1 }), "d")} au ${format(endOfWeek(today, { weekStartsOn: 1 }), "d MMMM", { locale: fr })}`,
    mois: capitalize(format(today, "MMMM yyyy", { locale: fr })),
    tout: "Depuis le début du portefeuille",
  }[periodMode];

  const messageDynamique = (() => {
    if (!precedent) return null;
    const total = (actuel.appels || 0) + (actuel.visites || 0) + (actuel.rdvPris || 0);
    const totalPrev = (precedent.appels || 0) + (precedent.visites || 0) + (precedent.rdvPris || 0);
    if (total > totalPrev) return { ton: "positif", texte: "Bonne dynamique par rapport à la période précédente." };
    if (total < totalPrev) return { ton: "negatif", texte: "En retrait par rapport à la période précédente — de quoi se relancer." };
    return { ton: "neutre", texte: "Rythme stable par rapport à la période précédente." };
  })();

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

        {/* ───────────────────── ACTIVITÉ (période sélectionnable) ───────────────────── */}
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-gd-mist/40 pb-2">
            <div className="flex items-baseline gap-2.5">
              <h2 className="gd-title text-base text-gd-blue">Activité commerciale</h2>
              <span className="text-xs text-muted-foreground">{sousTitrePeriode}</span>
            </div>
            <PeriodToggle value={periodMode} onChange={setPeriodMode} />
          </div>

          {messageDynamique && (
            <p className={`mb-3 text-sm font-semibold ${
              messageDynamique.ton === "positif" ? "text-emerald-600" : messageDynamique.ton === "negatif" ? "text-gd-danger" : "text-slate-500"
            }`}>
              {messageDynamique.texte}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <ActivityTile icon={Phone} label="Appels" value={actuel.appels} prev={precedent?.appels} />
            <ActivityTile icon={Video} label="Visites" value={actuel.visites} prev={precedent?.visites} />
            <ActivityTile icon={CalendarCheck} label="RDV pris" value={actuel.rdvPris} prev={precedent?.rdvPris} />
            <ActivityTile icon={Star} label="Clients contactés" value={actuel.contactes} prev={precedent?.contactes} />
          </div>
        </section>

        {/* ───────────────────── PORTEFEUILLE (vue globale) ───────────────────── */}
        <DashboardSection title="Portefeuille" subtitle="Vue d'ensemble globale">
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
      </div>
    </div>
  );
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function PeriodToggle({ value, onChange }) {
  return (
    <div className="inline-flex rounded-xl border border-gd-mist/60 bg-white p-1">
      {PERIODES.map((p) => (
        <button
          key={p.cle}
          onClick={() => onChange(p.cle)}
          className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
            value === p.cle ? "bg-gd-blue text-white shadow-sm" : "text-slate-500 hover:text-gd-blue"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function DeltaBadge({ current, prev }) {
  if (prev == null) return null;
  const diff = (current || 0) - (prev || 0);
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
        <Minus className="h-2.5 w-2.5" /> stable
      </span>
    );
  }
  const positif = diff > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
      positif ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
    }`}>
      {positif ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
      {positif ? "+" : ""}{diff}
    </span>
  );
}

function ActivityTile({ icon: Icon, label, value, prev }) {
  return (
    <div className="gd-hatch rounded-xl border border-gd-mist/50 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gd-blue text-white">
          <Icon className="h-5 w-5" />
        </div>
        <DeltaBadge current={value} prev={prev} />
      </div>
      <div className="gd-tabular mt-3 text-3xl font-extrabold text-foreground">{value ?? 0}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
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
