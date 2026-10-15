import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageTitle from "@/components/PageTitle";
import { formatMontant } from "@/lib/crm-constants";
import { PROBABILITE_ETAPE } from "@/lib/crm-constants";
import { Phone, Users, TrendingUp, Target, Building2, Award } from "lucide-react";

export default function TableauDeBord() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [totalComptes, contactes, pipelineAgg, appelsCount, rdvCount, gagnesCount] = await Promise.all([
          base44.entities.Compte.count({}),
          base44.entities.Compte.count({ date_dernier_contact: { $exists: true } }),
          base44.entities.Opportunite.aggregate({ groupBy: "etape", sum: "montant_ht" }),
          base44.entities.Interaction.count({ type: "Appel" }),
          base44.entities.Interaction.count({ resultat: "RDV pris" }),
          base44.entities.Opportunite.count({ etape: "Gagné" }),
        ]);

        const pipelineBrut = (pipelineAgg.rows || []).reduce((s, r) => s + (r.sum_montant_ht || 0), 0);
        const pipelinePondere = (pipelineAgg.rows || []).reduce((s, r) => s + ((r.sum_montant_ht || 0) * (PROBABILITE_ETAPE[r.etape] || 0)) / 100, 0);

        setKpis({
          totalComptes,
          contactes,
          tauxCouverture: totalComptes > 0 ? Math.round((contactes / totalComptes) * 100) : 0,
          pipelineBrut,
          pipelinePondere,
          appels: appelsCount,
          rdv: rdvCount,
          gagnes: gagnesCount,
        });
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

  return (
    <div className="animate-fade-in">
      <PageTitle subtitle="Vue d'ensemble de l'activité">Tableau de bord</PageTitle>
      <div className="space-y-5 p-4 lg:p-8">
        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard icon={Building2} label="Comptes total" value={k.totalComptes || 0} accent="blue" />
          <KpiCard icon={Target} label="Taux de couverture" value={`${k.tauxCouverture || 0}%`} accent="yellow" sub={`${k.contactes || 0} contactés`} />
          <KpiCard icon={Phone} label="Appels" value={k.appels || 0} accent="blue" />
          <KpiCard icon={Award} label="RDV pris" value={k.rdv || 0} accent="yellow" />
        </div>

        {/* Pipeline */}
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="gd-hatch rounded-xl border border-gd-mist/50 bg-white p-5">
            <div className="flex items-center gap-2 text-gd-blue">
              <TrendingUp className="h-5 w-5" />
              <h3 className="gd-title text-sm">Pipeline</h3>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">Pipeline brut</div>
                <div className="gd-tabular text-2xl font-extrabold text-gd-blue">{formatMontant(k.pipelineBrut)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Pipeline pondéré</div>
                <div className="gd-tabular text-2xl font-extrabold text-gd-navy">{formatMontant(k.pipelinePondere)}</div>
              </div>
            </div>
          </div>

          {/* Entonnoir */}
          <div className="rounded-xl border border-gd-mist/50 bg-white p-5">
            <div className="flex items-center gap-2 text-gd-blue">
              <Users className="h-5 w-5" />
              <h3 className="gd-title text-sm">Entonnoir de conversion</h3>
            </div>
            <div className="mt-4 space-y-2">
              <FunnelRow label="Comptes contactés" value={k.contactes || 0} max={k.totalComptes || 1} color="bg-gd-blue" />
              <FunnelRow label="RDV pris" value={k.rdv || 0} max={k.totalComptes || 1} color="bg-gd-navy" />
              <FunnelRow label="Opportunités gagnées" value={k.gagnes || 0} max={k.totalComptes || 1} color="bg-emerald-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accent, sub }) {
  const accentClass = accent === "yellow" ? "bg-gd-yellow text-gd-black" : "bg-gd-blue text-white";
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

function FunnelRow({ label, value, max, color }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="gd-tabular font-semibold">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-gd-ice">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}