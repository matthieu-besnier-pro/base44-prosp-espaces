import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageTitle from "@/components/PageTitle";
import { STATUTS_COMPTE, STATUT_COULEUR } from "@/lib/crm-constants";
import { AlertTriangle, CalendarCheck, PhoneOff, Wrench, Phone, Video } from "lucide-react";
import { startOfWeek, endOfWeek, addDays, addMonths, format } from "date-fns";

export default function TableauDeBord() {
  const [kpis, setKpis] = useState(null);
  const [repartition, setRepartition] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const today = new Date();
        const todayStr = format(today, "yyyy-MM-dd");
        const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
        const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
        const sevenDaysAgo = format(addDays(today, -7), "yyyy-MM-dd'T'HH:mm:ss");
        const in12Months = format(addMonths(today, 12), "yyyy-MM-dd");

        const [
          totalComptes,
          tachesRetard,
          rdvVisites,
          rdvDemos,
          jamaisContactes,
          equipementsARenouveler,
          appels7j,
          visites7j,
          rdvPris7j,
          statutCounts,
          sansStatut,
        ] = await Promise.all([
          base44.entities.Compte.count({}),
          base44.entities.Tache.count({ statut: "À faire", echeance: { $lt: todayStr } }),
          base44.entities.Tache.count({ statut: "À faire", type: "Visite", echeance: { $gte: weekStart, $lte: weekEnd } }),
          base44.entities.Tache.count({ statut: "À faire", type: "Démo", echeance: { $gte: weekStart, $lte: weekEnd } }),
          base44.entities.Compte.count({ date_dernier_contact: { $exists: false } }),
          base44.entities.Equipement.count({ date_renouvellement_estimee: { $gte: todayStr, $lte: in12Months } }),
          base44.entities.Interaction.count({ type: "Appel", date_heure: { $gte: sevenDaysAgo } }),
          base44.entities.Interaction.count({ type: "Visite", date_heure: { $gte: sevenDaysAgo } }),
          base44.entities.Interaction.count({ resultat: "RDV pris", date_heure: { $gte: sevenDaysAgo } }),
          Promise.all(STATUTS_COMPTE.map((s) => base44.entities.Compte.count({ statut: s }))),
          base44.entities.Compte.count({ statut: { $exists: false } }),
        ]);

        setKpis({
          totalComptes,
          tachesRetard,
          rdvSemaine: rdvVisites + rdvDemos,
          jamaisContactes,
          equipementsARenouveler,
          appels7j,
          visites7j,
          rdvPris7j,
        });

        const rep = STATUTS_COMPTE.map((s, i) => ({ statut: s, count: statutCounts[i] }));
        rep[0].count += sansStatut; // comptes sans statut = "À qualifier" par défaut
        setRepartition(rep);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gd-mist border-t-gd-blue" />
      </div>
    );
  }

  const k = kpis || {};
  const maxRepartition = Math.max(1, ...repartition.map((r) => r.count));

  return (
    <div className="animate-fade-in">
      <PageTitle subtitle={`${k.totalComptes || 0} comptes en portefeuille · Zone 16, 79, 86`}>Tableau de bord</PageTitle>
      <div className="space-y-5 p-4 lg:p-8">
        {/* KPI cards : ce qu'un commercial doit traiter aujourd'hui */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            icon={AlertTriangle}
            label="Tâches en retard"
            value={k.tachesRetard || 0}
            accent={(k.tachesRetard || 0) > 0 ? "danger" : "blue"}
          />
          <KpiCard icon={CalendarCheck} label="RDV cette semaine" value={k.rdvSemaine || 0} accent="yellow" />
          <KpiCard icon={PhoneOff} label="Jamais contactés" value={k.jamaisContactes || 0} accent="blue" />
          <KpiCard icon={Wrench} label="Équip. à renouveler" value={k.equipementsARenouveler || 0} sub="sous 12 mois" accent="yellow" />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {/* Répartition réelle des comptes dans le cycle de prospection */}
          <div className="gd-hatch rounded-xl border border-gd-mist/50 bg-white p-5">
            <h3 className="gd-title mb-4 text-sm text-gd-blue">Répartition des comptes par statut</h3>
            <div className="space-y-2.5">
              {repartition.map((r) => (
                <RepartitionRow key={r.statut} statut={r.statut} count={r.count} max={maxRepartition} />
              ))}
            </div>
          </div>

          {/* Activité réelle et récente, pas un total figé depuis toujours */}
          <div className="rounded-xl border border-gd-mist/50 bg-white p-5">
            <h3 className="gd-title mb-4 text-sm text-gd-blue">Activité des 7 derniers jours</h3>
            <div className="grid grid-cols-3 gap-3">
              <ActiviteTile icon={Phone} label="Appels" value={k.appels7j || 0} />
              <ActiviteTile icon={Video} label="Visites" value={k.visites7j || 0} />
              <ActiviteTile icon={CalendarCheck} label="RDV pris" value={k.rdvPris7j || 0} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accent, sub }) {
  const accentClass =
    accent === "yellow" ? "bg-gd-yellow text-gd-black" :
    accent === "danger" ? "bg-gd-danger text-white" :
    "bg-gd-blue text-white";
  return (
    <div className="gd-hatch rounded-xl border border-gd-mist/50 bg-white p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="gd-tabular mt-3 text-2xl font-extrabold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground/70">{sub}</div>}
    </div>
  );
}

function RepartitionRow({ statut, count, max }) {
  const c = STATUT_COULEUR[statut] || STATUT_COULEUR["À qualifier"];
  const pct = Math.round((count / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{statut}</span>
        <span className="gd-tabular font-semibold">{count}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-gd-ice">
        <div className={`h-full rounded-full ${c.dot}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ActiviteTile({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-gd-ice p-3 text-center">
      <Icon className="h-5 w-5 text-gd-blue" />
      <div className="gd-tabular mt-1.5 text-xl font-extrabold text-foreground">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
