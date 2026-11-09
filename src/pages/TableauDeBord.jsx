import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageTitle from "@/components/PageTitle";
import { STATUTS_COMPTE, STATUT_COULEUR, PIPELINE_STEPS } from "@/lib/crm-constants";
import {
  AlertTriangle, CalendarCheck, PhoneOff, Wrench, Phone, Video, Users,
  Sparkles, ArrowUpRight, ArrowDownRight, Minus, Trophy,
} from "lucide-react";
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subDays, subWeeks, subMonths, addMonths, format,
} from "date-fns";
import { fr } from "date-fns/locale";

const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);

const PERIODES = [
  { cle: "jour", label: "Jour" },
  { cle: "semaine", label: "Hebdo" },
  { cle: "mois", label: "Mois" },
  { cle: "tout", label: "Tout" },
];

// Métriques suivies pour chaque période, avec leur icône et l'échelle de référence
// utilisée pour les petits repères de rythme des cadrans du jour (pas une limite dure,
// juste de quoi situer visuellement une valeur "normale" pour une seule personne/jour).
const METRIQUES = [
  { cle: "appels", label: "Appels", icon: Phone, echelleJour: 15 },
  { cle: "visites", label: "Visites", icon: Video, echelleJour: 6 },
  { cle: "rdvPris", label: "RDV pris", icon: CalendarCheck, echelleJour: 4 },
  { cle: "contactes", label: "Contactés", icon: Users, echelleJour: 10 },
];

const totalPeriode = (d) => (d?.appels || 0) + (d?.visites || 0) + (d?.rdvPris || 0) + (d?.contactes || 0);

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

  const sousTitresPeriode = {
    jour: capitalize(format(today, "EEEE d MMMM", { locale: fr })),
    semaine: `Semaine du ${format(startOfWeek(today, { weekStartsOn: 1 }), "d")} au ${format(endOfWeek(today, { weekStartsOn: 1 }), "d MMMM", { locale: fr })}`,
    mois: capitalize(format(today, "MMMM yyyy", { locale: fr })),
    tout: "Depuis le début",
  };

  // Élan du jour : variation de l'activité totale par rapport à hier. Sert de fil rouge
  // au cadran principal du cockpit (voir CockpitHero ci-dessous).
  const totalJour = totalPeriode(activite.jour);
  const totalHier = activite.jour.prev ? totalPeriode(activite.jour.prev) : 0;
  const elanPct = totalHier > 0 ? Math.round(((totalJour - totalHier) / totalHier) * 100) : (totalJour > 0 ? 100 : 0);

  // Période "en tête" du scoreboard : celle dont l'activité totale progresse le plus
  // par rapport à la période précédente équivalente ("Tout" n'a pas de précédent, donc
  // n'entre jamais en lice — pas de triche possible sur un cumul qui ne peut que croître).
  let periodeEnTete = null;
  let meilleurDelta = -Infinity;
  for (const cle of ["jour", "semaine", "mois"]) {
    const d = activite[cle];
    const prevTotal = d.prev ? totalPeriode(d.prev) : 0;
    if (prevTotal <= 0) continue;
    const deltaPct = (totalPeriode(d) - prevTotal) / prevTotal;
    if (deltaPct > meilleurDelta) { meilleurDelta = deltaPct; periodeEnTete = cle; }
  }

  const funnelData = PIPELINE_STEPS.map((s) => ({ statut: s, count: repartition.find((r) => r.statut === s)?.count || 0 }));
  const maxFunnel = Math.max(1, ...funnelData.map((f) => f.count));
  const exitsData = repartition.filter((r) => !PIPELINE_STEPS.includes(r.statut));

  return (
    <div className="animate-fade-in">
      <PageTitle subtitle={`${k.totalComptes || 0} clients en portefeuille · Zone 16, 79, 86`}>Tableau de bord</PageTitle>

      <div className="space-y-6 p-4 lg:p-8">
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

        <CockpitHero elanPct={elanPct} totalJour={totalJour} totalHier={totalHier} jour={activite.jour} />

        <Scoreboard sousTitresPeriode={sousTitresPeriode} activite={activite} periodeEnTete={periodeEnTete} />

        <Funnel funnelData={funnelData} maxFunnel={maxFunnel} exitsData={exitsData} />

        <PortfolioStrip k={k} />
      </div>
    </div>
  );
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
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
      positif ? "bg-gd-success/15 text-gd-success" : "bg-gd-danger/10 text-gd-danger"
    }`}>
      {positif ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
      {positif ? "+" : ""}{diff}
    </span>
  );
}

// ───────────────────────── COCKPIT (hero : élan du jour + cadrans) ─────────────────────────

function CockpitHero({ elanPct, totalJour, totalHier, jour }) {
  const ringFill = Math.min(100, Math.max(0, 50 + elanPct));
  const size = 150, stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - ringFill / 100);
  const humeur = elanPct > 0 ? "ça pousse" : elanPct < 0 ? "en retrait — de quoi se relancer" : "rythme stable";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gd-navy via-gd-blue to-[#04142B] p-6 text-white shadow-xl">
      <div className="pointer-events-none absolute -left-12 -top-16 h-64 w-[640px] rounded-full bg-gd-yellow/10 blur-3xl" />
      <div className="relative grid gap-6 lg:grid-cols-[200px_1fr]">
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="gd-title text-[11px] tracking-widest text-gd-yellow">Élan du jour</p>
          <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={stroke} />
              <circle
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke="#FEB800" strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.22,.8,.3,1)", filter: "drop-shadow(0 0 7px rgba(254,184,0,.55))" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="gd-tabular text-3xl font-extrabold">{elanPct >= 0 ? "+" : ""}{elanPct}%</span>
              <span className="mt-1 text-[10px] uppercase tracking-wider text-white/60">vs hier</span>
            </div>
          </div>
          <p className="max-w-[190px] text-xs text-white/70">
            <b className="text-white">{totalJour} action{totalJour > 1 ? "s" : ""}</b> aujourd'hui contre {totalHier} hier — {humeur}.
          </p>
        </div>

        <div className="grid grid-cols-2 content-center gap-3 sm:grid-cols-4">
          {METRIQUES.map((m) => (
            <Instrument key={m.cle} metrique={m} value={jour[m.cle]} prev={jour.prev?.[m.cle]} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Instrument({ metrique, value, prev }) {
  const Icon = metrique.icon;
  const nbTicks = 8;
  const ticksOn = Math.min(nbTicks, Math.round(Math.min(1, (value || 0) / metrique.echelleJour) * nbTicks) || (value > 0 ? 1 : 0));
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[.08] to-transparent p-3.5">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/60">
        <Icon className="h-3.5 w-3.5 text-gd-yellow" />
        {metrique.label}
      </div>
      <div className="gd-tabular mt-1.5 text-2xl font-extrabold">{value ?? 0}</div>
      <DeltaDirection value={value} prev={prev} />
      <div className="mt-2.5 flex gap-[3px]">
        {Array.from({ length: nbTicks }).map((_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-sm ${i < ticksOn ? "bg-gd-yellow" : "bg-white/15"}`} />
        ))}
      </div>
    </div>
  );
}

function DeltaDirection({ value, prev }) {
  if (prev == null) return null;
  const diff = (value || 0) - (prev || 0);
  const cls = diff > 0 ? "text-emerald-300" : diff < 0 ? "text-rose-300" : "text-white/50";
  return (
    <div className={`mt-0.5 flex items-center gap-1 text-[11px] font-semibold ${cls}`}>
      {diff !== 0 && (diff > 0
        ? <ArrowUpRight className="h-3 w-3" />
        : <ArrowDownRight className="h-3 w-3" />)}
      {diff === 0 ? "stable" : `${diff > 0 ? "+" : ""}${diff} vs hier`}
    </div>
  );
}

// ───────────────────────── SCOREBOARD (Jour / Hebdo / Mois / Tout) ─────────────────────────

function Scoreboard({ sousTitresPeriode, activite, periodeEnTete }) {
  return (
    <section className="rounded-2xl border border-gd-mist/50 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="gd-title text-sm text-gd-blue">Jour · Hebdo · Mois · Tout</h2>
        <span className="text-xs text-muted-foreground">Chaque période vs la précédente équivalente</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse">
          <thead>
            <tr>
              <th className="w-[150px]" />
              {PERIODES.map((p) => {
                const enTete = p.cle === periodeEnTete;
                return (
                  <th key={p.cle} className={`pb-3 text-center ${enTete ? "text-gd-navy" : ""}`}>
                    {enTete && (
                      <div className="mb-0.5 flex justify-center">
                        <Trophy className="h-4 w-4 fill-gd-yellow text-gd-yellow" />
                      </div>
                    )}
                    <div className="gd-title text-xs">{p.label}</div>
                    <div className="mt-0.5 text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
                      {sousTitresPeriode[p.cle]}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {METRIQUES.map((m) => (
              <tr key={m.cle} className="border-t border-gd-mist/30">
                <td className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                  <m.icon className="h-3.5 w-3.5 shrink-0 text-gd-blue" /> {m.label}
                </td>
                {PERIODES.map((p) => {
                  const d = activite[p.cle];
                  const enTete = p.cle === periodeEnTete;
                  return (
                    <td key={p.cle} className={`py-3 text-center ${enTete ? "rounded-lg bg-gd-yellow/10" : ""}`}>
                      <div className="gd-tabular text-lg font-extrabold text-foreground">{d[m.cle] ?? 0}</div>
                      <div className="mt-0.5 flex justify-center">
                        <DeltaBadge current={d[m.cle]} prev={d.prev?.[m.cle]} />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ───────────────────────── PIPELINE (entonnoir + sorties) ─────────────────────────

function Funnel({ funnelData, maxFunnel, exitsData }) {
  return (
    <section className="rounded-2xl border border-gd-mist/50 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="gd-title text-sm text-gd-blue">Pipeline de prospection</h2>
        <span className="text-xs text-muted-foreground">Répartition du portefeuille, étape par étape</span>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_200px]">
        <div className="flex flex-col gap-2">
          {funnelData.map((f) => {
            const c = STATUT_COULEUR[f.statut] || STATUT_COULEUR["À qualifier"];
            const p = Math.round((f.count / maxFunnel) * 100);
            return (
              <div key={f.statut} className="grid grid-cols-[120px_1fr_52px] items-center gap-2.5">
                <span className="truncate text-right text-xs text-muted-foreground">{f.statut}</span>
                <div className="h-6 overflow-hidden rounded-md bg-gd-ice">
                  <div className={`h-full rounded-md ${c.dot}`} style={{ width: `${p}%` }} />
                </div>
                <span className="gd-tabular text-right text-xs font-bold">{f.count}</span>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col justify-center gap-2.5 border-t border-dashed border-gd-mist/60 pt-3 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          {exitsData.map((e) => {
            const c = STATUT_COULEUR[e.statut] || STATUT_COULEUR["À qualifier"];
            return (
              <div key={e.statut} className="flex items-center justify-between gap-2 text-xs">
                <span className={`h-2 w-2 shrink-0 rounded-full ${c.dot}`} />
                <span className="flex-1 truncate text-muted-foreground">{e.statut}</span>
                <span className="gd-tabular font-bold">{e.count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────── PORTEFEUILLE (bandeau discret) ─────────────────────────

function PortfolioStrip({ k }) {
  const items = [
    { label: "Taux de conversion", value: `${pct(k.clientsCount, k.totalComptes)}%` },
    { label: "Potentiel A", value: k.potentielACount },
    { label: "Score ≥ 70", value: k.scoreEleveCount },
    { label: "Jamais contactés", value: k.jamaisContactes, warn: k.jamaisContactes > 0 },
    { label: "Équip. à renouveler", value: k.equipementsARenouveler },
    { label: "Tâches en retard", value: k.tachesRetard, warn: k.tachesRetard > 0 },
  ];
  return (
    <section className="rounded-2xl border border-gd-mist/50 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((it, i) => (
          <div key={it.label} className={`px-4 py-1 ${i > 0 ? "border-gd-mist/40 sm:border-l" : ""} ${i % 2 === 1 ? "border-l border-gd-mist/40 sm:border-l-0" : ""}`}>
            <div className={`gd-tabular text-xl font-extrabold ${it.warn ? "text-gd-warning" : "text-foreground"}`}>{it.value}</div>
            <div className="text-[11px] text-muted-foreground">{it.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
