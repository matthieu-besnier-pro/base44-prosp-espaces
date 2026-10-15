import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageTitle from "@/components/PageTitle";
import ClientLink from "@/components/ClientLink";
import { toast } from "@/components/ui/use-toast";
import { Phone, MapPin, AlertCircle, Calendar, Sparkles, ChevronRight, Trash2 } from "lucide-react";
import { endOfWeek, format } from "date-fns";
import { fr } from "date-fns/locale";

const toIso = (d) => format(d, "yyyy-MM-dd");

export default function MaJournee() {
  const [retards, setRetards] = useState([]);
  const [aujourdhui, setAujourdhui] = useState([]);
  const [rdvSemaine, setRdvSemaine] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadJournee = async () => {
      setLoading(true);
      try {
        const today = new Date();
        const todayStr = toIso(today);
        const weekEndStr = toIso(endOfWeek(today, { weekStartsOn: 1 }));

        const [retardRes, aujourdhuiRes, semaineRes, suggestionsRes] = await Promise.all([
          base44.entities.Tache.filter(
            { statut: "À faire", echeance: { $lt: todayStr } },
            { sort: "echeance", limit: 20 }
          ),
          base44.entities.Tache.filter(
            { statut: "À faire", echeance: todayStr },
            { limit: 20 }
          ),
          base44.entities.Tache.filter(
            { statut: "À faire", echeance: { $gt: todayStr, $lte: weekEndStr } },
            { sort: "echeance", limit: 30 }
          ),
          base44.entities.Compte.filter(
            { statut: { $ne: "Client" } },
            { sort: "-score", limit: 15, fields: ["raison_sociale", "ville", "departement", "statut", "potentiel", "score", "telephone_1"] }
          ),
        ]);

        const retardItems = retardRes.items || retardRes;
        const aujourdhuiItems = aujourdhuiRes.items || aujourdhuiRes;
        const semaineItems = (semaineRes.items || semaineRes).filter((t) => t.type === "Visite" || t.type === "Démo");

        const ids = [...new Set([...retardItems, ...aujourdhuiItems, ...semaineItems].map((t) => t.compte_id).filter(Boolean))];
        const comptes = await Promise.all(ids.map((id) => base44.entities.Compte.get(id).catch(() => null)));
        const comptesById = {};
        comptes.forEach((c) => { if (c) comptesById[c.id] = c; });

        setRetards(retardItems.map((t) => ({ tache: t, compte: comptesById[t.compte_id] })));
        setAujourdhui(aujourdhuiItems.map((t) => ({ tache: t, compte: comptesById[t.compte_id] })));
        setRdvSemaine(semaineItems.map((t) => ({ tache: t, compte: comptesById[t.compte_id] })));

        const suggestionsItems = (suggestionsRes.items || suggestionsRes)
          .filter((c) => !["Perdu", "Hors cible"].includes(c.statut))
          .slice(0, 5);
        setSuggestions(suggestionsItems);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
  };

  useEffect(() => {
    loadJournee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteTache = async (tacheId) => {
    if (!window.confirm("Supprimer cette tâche ?")) return;
    try {
      await base44.entities.Tache.delete(tacheId);
      toast({ title: "Tâche supprimée" });
      await loadJournee();
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "La suppression a échoué.", variant: "destructive" });
    }
  };

  const dateDuJour = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gd-mist border-t-gd-blue" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageTitle subtitle={dateDuJour.charAt(0).toUpperCase() + dateDuJour.slice(1)}>Ma journée</PageTitle>

      <div className="space-y-5 p-4 lg:max-w-5xl lg:p-8">
        <Section icon={AlertCircle} title="En retard" color="gd-danger" count={retards.length}>
          {retards.length === 0 ? (
            <EmptyRow text="Aucune tâche en retard, bravo !" />
          ) : (
            retards.map(({ tache, compte }) => <TaskRow key={tache.id} tache={tache} compte={compte} urgent onDelete={deleteTache} />)
          )}
        </Section>

        <Section icon={Calendar} title="Aujourd'hui" count={aujourdhui.length}>
          {aujourdhui.length === 0 ? (
            <EmptyRow text="Rien de prévu aujourd'hui" />
          ) : (
            aujourdhui.map(({ tache, compte }) => <TaskRow key={tache.id} tache={tache} compte={compte} onDelete={deleteTache} />)
          )}
        </Section>

        <Section icon={MapPin} title="RDV de la semaine" count={rdvSemaine.length}>
          {rdvSemaine.length === 0 ? (
            <EmptyRow text="Pas de RDV planifié cette semaine" />
          ) : (
            rdvSemaine.map(({ tache, compte }) => <RdvRow key={tache.id} tache={tache} compte={compte} onDelete={deleteTache} />)
          )}
        </Section>

        <Section icon={Sparkles} title="Suggestions IA" count={suggestions.length}>
          {suggestions.length === 0 ? (
            <EmptyRow text="Importez votre fichier de prospects pour obtenir des suggestions" />
          ) : (
            suggestions.map((c) => <SuggestionRow key={c.id} compte={c} />)
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, color, count, children }) {
  return (
    <section className="rounded-xl border border-gd-mist/50 bg-white shadow-sm">
      <header className={`flex items-center gap-2.5 border-b border-gd-mist/40 px-4 py-3 ${color ? `text-gd-danger` : "text-gd-blue"}`}>
        <Icon className="h-5 w-5" strokeWidth={2.2} />
        <h2 className="gd-title text-sm">{title}</h2>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {count}
        </span>
      </header>
      <div className="divide-y divide-gd-mist/30">{children}</div>
    </section>
  );
}

function EmptyRow({ text }) {
  return <p className="px-4 py-6 text-center text-xs text-muted-foreground">{text}</p>;
}

function TaskRow({ tache, compte, urgent, onDelete }) {
  if (!compte) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <ClientLink compte={compte} className="truncate text-sm font-semibold text-foreground" />
          {tache.heure && <span className="shrink-0 text-xs font-medium text-gd-blue">{tache.heure}</span>}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{compte.ville || "—"}</span>
          <span className="text-slate-300">·</span>
          <span className="truncate">{tache.titre}</span>
        </div>
      </div>
      {compte.score != null && (
        <div className="hidden shrink-0 rounded-md bg-gd-ice px-2 py-1 text-xs font-bold text-gd-blue sm:block">
          {compte.score}
        </div>
      )}
      {compte.telephone_1 ? (
        <a
          href={`tel:${compte.telephone_1.replace(/\s/g, "")}`}
          className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white active:scale-95 ${urgent ? "bg-gd-danger" : "bg-gd-blue"}`}
        >
          <Phone className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Appeler</span>
        </a>
      ) : (
        <span className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-400">
          Pas de tel
        </span>
      )}
      <button onClick={() => onDelete(tache.id)} className="shrink-0 text-slate-300 hover:text-gd-danger" title="Supprimer cette tâche">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function RdvRow({ tache, compte, onDelete }) {
  if (!compte) return null;
  const date = new Date(`${tache.echeance}T00:00:00`);
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-gd-ice py-1.5">
        <span className="text-[10px] font-medium text-muted-foreground">{format(date, "EEE", { locale: fr })}</span>
        <span className="text-sm font-bold text-gd-blue">{format(date, "d MMM", { locale: fr })}</span>
      </div>
      <div className="min-w-0 flex-1">
        <ClientLink compte={compte} className="truncate text-sm font-semibold" />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{compte.ville || "—"}</span>
          {tache.heure && (
            <>
              <span className="text-slate-300">·</span>
              <span>{tache.heure}</span>
            </>
          )}
          <span className="text-slate-300">·</span>
          <span className="font-medium text-gd-blue">{tache.type}</span>
        </div>
      </div>
      <button onClick={() => onDelete(tache.id)} className="shrink-0 text-slate-300 hover:text-gd-danger" title="Supprimer ce RDV">
        <Trash2 className="h-4 w-4" />
      </button>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
    </div>
  );
}

function SuggestionRow({ compte }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gd-yellow/15 text-gd-yellow">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <ClientLink compte={compte} className="truncate text-sm font-semibold" />
          {compte.potentiel && (
            <span className="rounded bg-gd-yellow px-1.5 py-0.5 text-[10px] font-bold text-gd-black">
              {compte.potentiel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{compte.ville || "—"}</span>
          <span className="text-slate-300">·</span>
          <span className="truncate">{compte.statut || "À qualifier"}</span>
        </div>
      </div>
      {compte.score != null && (
        <div className="hidden shrink-0 rounded-md bg-gd-ice px-2 py-1 text-xs font-bold text-gd-blue sm:block">
          {compte.score}
        </div>
      )}
      {compte.telephone_1 ? (
        <a
          href={`tel:${compte.telephone_1.replace(/\s/g, "")}`}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gd-blue px-3 py-2 text-xs font-semibold text-white active:scale-95"
        >
          <Phone className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Appeler</span>
        </a>
      ) : null}
    </div>
  );
}
