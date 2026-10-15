import PageTitle from "@/components/PageTitle";
import { Phone, MapPin, AlertCircle, Calendar, Sparkles, ChevronRight } from "lucide-react";

// DONNÉES D'EXEMPLE — seront remplacées par les vraies données au prochain lot
const EXEMPLE_RETARDS = [
  { id: "r1", nom: "Commune de Cognac", ville: "Cognac (16)", raison: "Rappel devis tondeuse", tel: "05 45 82 10 00", score: 78 },
  { id: "r2", nom: "GAEC de Saint-Marc", ville: "Angoulême (16)", raison: "Relance épareuse", tel: "05 45 95 32 77", score: 65 },
];

const EXEMPLE_AUJOURDHUI = [
  { id: "a1", nom: "Communauté d'agglo du Grand Angoulême", ville: "Angoulême (16)", raison: "RDV démo tracteur compact", tel: "05 45 61 88 10", heure: "10:30" },
  { id: "a2", nom: "Marechal Élagage", ville: "Angoulême (16)", raison: "Appel de prospection", tel: null, score: 72 },
];

const EXEMPLE_RDV = [
  { id: "rdv1", nom: "Communauté de communes de Vienne et Gartempe", ville: "Montmorillon (86)", date: "Jeu 16 oct", heure: "14:00", type: "Visite" },
  { id: "rdv2", nom: "Paysagiste Durand", ville: "Niort (79)", date: "Ven 17 oct", heure: "09:00", type: "Démo" },
];

const EXEMPLE_SUGGESTIONS = [
  { id: "s1", nom: "Commune de Bressuire", ville: "Bressuire (79)", raison: "Score élevé, non contacté", tel: "05 49 80 49 80", score: 85, potentiel: "A" },
  { id: "s2", nom: "Centre équestre du Clain", ville: "Poitiers (86)", raison: "Parc à renouveler", tel: "05 49 88 12 00", score: 80, potentiel: "A" },
  { id: "s3", nom: "Élagueurs Charente Services", ville: "Cognac (16)", raison: "Budget voté", tel: "05 45 32 14 00", score: 76, potentiel: "B" },
];

export default function MaJournee() {
  return (
    <div className="animate-fade-in">
      <PageTitle subtitle="Jeudi 15 octobre 2026">Ma journée</PageTitle>

      <div className="space-y-5 p-4 lg:max-w-5xl lg:p-8">
        {/* En retard */}
        <Section
          icon={AlertCircle}
          title="En retard"
          color="gd-danger"
          count={EXEMPLE_RETARDS.length}
        >
          {EXEMPLE_RETARDS.map((t) => (
            <TaskRow key={t.id} t={t} urgent />
          ))}
        </Section>

        {/* Aujourd'hui */}
        <Section icon={Calendar} title="Aujourd'hui" count={EXEMPLE_AUJOURDHUI.length}>
          {EXEMPLE_AUJOURDHUI.map((t) => (
            <TaskRow key={t.id} t={t} />
          ))}
        </Section>

        {/* RDV de la semaine */}
        <Section icon={MapPin} title="RDV de la semaine" count={EXEMPLE_RDV.length}>
          {EXEMPLE_RDV.map((t) => (
            <RdvRow key={t.id} t={t} />
          ))}
        </Section>

        {/* Suggestions */}
        <Section icon={Sparkles} title="Suggestions IA" count={EXEMPLE_SUGGESTIONS.length}>
          {EXEMPLE_SUGGESTIONS.map((t) => (
            <SuggestionRow key={t.id} t={t} />
          ))}
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

function TaskRow({ t, urgent }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">{t.nom}</span>
          {t.heure && <span className="shrink-0 text-xs font-medium text-gd-blue">{t.heure}</span>}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{t.ville}</span>
          <span className="text-slate-300">·</span>
          <span className="truncate">{t.raison}</span>
        </div>
      </div>
      {t.score != null && (
        <div className="hidden shrink-0 rounded-md bg-gd-ice px-2 py-1 text-xs font-bold text-gd-blue sm:block">
          {t.score}
        </div>
      )}
      {t.tel ? (
        <a
          href={`tel:${t.tel.replace(/\s/g, "")}`}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gd-blue px-3 py-2 text-xs font-semibold text-white active:scale-95"
        >
          <Phone className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Appeler</span>
        </a>
      ) : (
        <span className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-400">
          Pas de tel
        </span>
      )}
    </div>
  );
}

function RdvRow({ t }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-gd-ice py-1.5">
        <span className="text-[10px] font-medium text-muted-foreground">{t.date.split(" ")[0]}</span>
        <span className="text-sm font-bold text-gd-blue">{t.date.split(" ")[1]}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{t.nom}</div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{t.ville}</span>
          <span className="text-slate-300">·</span>
          <span>{t.heure}</span>
          <span className="text-slate-300">·</span>
          <span className="font-medium text-gd-blue">{t.type}</span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
    </div>
  );
}

function SuggestionRow({ t }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gd-yellow/15 text-gd-yellow">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{t.nom}</span>
          <span className="rounded bg-gd-yellow px-1.5 py-0.5 text-[10px] font-bold text-gd-black">
            {t.potentiel}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{t.ville}</span>
          <span className="text-slate-300">·</span>
          <span className="truncate">{t.raison}</span>
        </div>
      </div>
      <div className="hidden shrink-0 rounded-md bg-gd-ice px-2 py-1 text-xs font-bold text-gd-blue sm:block">
        {t.score}
      </div>
      {t.tel ? (
        <a
          href={`tel:${t.tel.replace(/\s/g, "")}`}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gd-blue px-3 py-2 text-xs font-semibold text-white active:scale-95"
        >
          <Phone className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Appeler</span>
        </a>
      ) : null}
    </div>
  );
}