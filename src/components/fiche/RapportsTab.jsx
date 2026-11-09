import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { TEMPERATURE_COULEUR, formatDateHeure } from "@/lib/crm-constants";
import { toast } from "@/components/ui/use-toast";
import { FileText, ChevronDown, CheckCircle2, Thermometer, Trash2 } from "lucide-react";

export default function RapportsTab({ compteId, onCount }) {
  const [rapports, setRapports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ouvert, setOuvert] = useState(null);

  const load = async () => {
    try {
      const res = await base44.entities.RapportContact.filter({ compte_id: compteId }, { sort: "-date_heure", limit: 50 });
      const items = res.items || res;
      setRapports(items);
      onCount?.(items.length);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compteId]);

  const valider = async (r) => {
    try {
      await base44.entities.RapportContact.update(r.id, { statut: "Validé" });
      toast({ title: "Rapport validé" });
      await load();
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "La validation a échoué.", variant: "destructive" });
    }
  };

  const supprimer = async (r) => {
    if (!window.confirm("Supprimer ce rapport ?")) return;
    try {
      await base44.entities.RapportContact.delete(r.id);
      toast({ title: "Rapport supprimé" });
      await load();
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "La suppression a échoué.", variant: "destructive" });
    }
  };

  if (loading) return <Spinner />;
  if (rapports.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gd-mist/60 bg-white p-8 text-center">
        <FileText className="mx-auto h-8 w-8 text-gd-mist" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">Aucun rapport pour ce client</p>
        <p className="mt-1 text-xs text-muted-foreground">Utilisez « Rapport oral » pour en dicter un</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rapports.map((r) => {
        const estOuvert = ouvert === r.id;
        const detailFields = [
          ["Contexte", r.contexte],
          ["Besoins", r.besoins],
          ["Matériel en place", r.materiel_en_place],
          ["Concurrence", r.concurrence],
          ["Objections", r.objections],
          ["Engagements", r.engagements],
          ["Prochaines étapes", r.prochaines_etapes],
        ].filter(([, v]) => v);

        return (
          <div key={r.id} className="rounded-xl border border-gd-mist/40 bg-white p-3">
            <button onClick={() => setOuvert(estOuvert ? null : r.id)} className="flex w-full items-start gap-2 text-left">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-gd-blue">{r.type_contact || "Contact"}</span>
                  <span className="text-xs text-muted-foreground">· {formatDateHeure(r.date_heure)}</span>
                  {r.temperature && (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${TEMPERATURE_COULEUR[r.temperature] || "bg-slate-100 text-slate-600"}`}>
                      <Thermometer className="h-2.5 w-2.5" /> {r.temperature}
                    </span>
                  )}
                  {r.statut === "À relire" && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">À relire</span>
                  )}
                  {r.statut === "Validé" && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Validé</span>
                  )}
                </div>
                {r.resume_ia && <p className="mt-1.5 text-sm text-foreground/80">{r.resume_ia}</p>}
              </div>
              <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform ${estOuvert ? "rotate-180" : ""}`} />
            </button>

            {estOuvert && (
              <div className="mt-3 space-y-2 border-t border-gd-mist/30 pt-3">
                {detailFields.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Pas de détail structuré supplémentaire.</p>
                ) : (
                  detailFields.map(([label, value]) => (
                    <div key={label} className="text-xs">
                      <span className="font-semibold text-gd-blue">{label} : </span>
                      <span className="text-foreground/80">{value}</span>
                    </div>
                  ))
                )}
                <div className="flex gap-2 pt-1">
                  {r.statut !== "Validé" && (
                    <button onClick={() => valider(r)} className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Valider
                    </button>
                  )}
                  <button onClick={() => supprimer(r)} className="flex items-center gap-1 rounded-lg bg-rose-100 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200">
                    <Trash2 className="h-3.5 w-3.5" /> Supprimer
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="h-6 w-6 animate-spin rounded-full border-4 border-gd-mist border-t-gd-blue" />
    </div>
  );
}
