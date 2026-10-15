import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { formatDateHeure } from "@/lib/crm-constants";
import { RESULTATS_INTERACTION } from "@/lib/crm-constants";
import { Phone, Calendar, Mail, Monitor, Award, MessageSquare, Plus } from "lucide-react";

const TYPE_ICON = {
  Appel: Phone, Visite: Calendar, Email: Mail, Démo: Monitor, Salon: Award, SMS: MessageSquare,
};

const RESULTAT_COLOR = {
  "Pas joignable": "bg-slate-100 text-slate-600",
  "À rappeler": "bg-amber-100 text-amber-700",
  "Intéressé": "bg-emerald-100 text-emerald-700",
  "Pas intéressé": "bg-rose-100 text-rose-700",
  "RDV pris": "bg-violet-100 text-violet-700",
  "Devis demandé": "bg-blue-100 text-blue-700",
};

export default function ActiviteTab({ compteId }) {
  const [interactions, setInteractions] = useState([]);
  const [taches, setTaches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [ints, tachesData] = await Promise.all([
          base44.entities.Interaction.filter({ compte_id: compteId }, { sort: "-date_heure", limit: 50 }),
          base44.entities.Tache.filter({ compte_id: compteId, statut: "À faire" }, { sort: "echeance", limit: 20 }),
        ]);
        setInteractions(ints.items || ints);
        setTaches(tachesData.items || tachesData);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [compteId]);

  if (loading) return <Spinner />;
  if (interactions.length === 0 && taches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gd-mist/60 bg-white p-8 text-center">
        <Phone className="mx-auto h-8 w-8 text-gd-mist" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">Aucune interaction enregistrée</p>
        <p className="mt-1 text-xs text-muted-foreground">Utilisez le bouton « + » pour saisir un appel ou une visite</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {taches.length > 0 && (
        <section>
          <h3 className="gd-title mb-3 text-sm text-gd-blue">Tâches en cours</h3>
          <div className="space-y-2">
            {taches.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg border border-gd-mist/40 bg-white p-3">
                <div className={`h-2 w-2 rounded-full ${t.priorite === "Haute" ? "bg-gd-danger" : "bg-gd-blue"}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{t.titre}</div>
                  <div className="text-xs text-muted-foreground">{t.type} · {t.echeance || "Sans échéance"}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <section>
        <h3 className="gd-title mb-3 text-sm text-gd-blue">Historique des interactions</h3>
        <div className="relative space-y-4 pl-6 before:absolute before:left-2.5 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-gd-mist/50">
          {interactions.map((i) => {
            const Icon = TYPE_ICON[i.type] || Phone;
            return (
              <div key={i.id} className="relative">
                <div className="absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full bg-gd-blue text-white">
                  <Icon className="h-3 w-3" />
                </div>
                <div className="rounded-lg border border-gd-mist/40 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-gd-blue">{i.type}</span>
                    <span className="text-xs text-muted-foreground">{formatDateHeure(i.date_heure)}</span>
                  </div>
                  {i.resultat && (
                    <span className={`mt-1.5 inline-block rounded px-2 py-0.5 text-[11px] font-medium ${RESULTAT_COLOR[i.resultat] || "bg-slate-100 text-slate-600"}`}>
                      {i.resultat}
                    </span>
                  )}
                  {i.compte_rendu && <p className="mt-2 text-sm text-foreground/80">{i.compte_rendu}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
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