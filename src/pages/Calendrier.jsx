import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PageTitle from "@/components/PageTitle";
import ClientLink from "@/components/ClientLink";
import { toast } from "@/components/ui/use-toast";
import { TYPES_TACHE, PRIORITES } from "@/lib/crm-constants";
import { downloadIcs } from "@/lib/crm-helpers";
import { startOfWeek, addDays, format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, Plus, X, Phone, MapPin, Download, Clock, Search, Check, Trash2,
} from "lucide-react";

const toIso = (d) => format(d, "yyyy-MM-dd");

export default function Calendrier() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const [taches, setTaches] = useState([]);
  const [comptesById, setComptesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const loadSemaine = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.Tache.filter(
        { echeance: { $gte: toIso(weekStart), $lte: toIso(addDays(weekStart, 6)) } },
        { sort: "echeance", limit: 200 }
      );
      const items = res.items || res;
      setTaches(items);
      const ids = [...new Set(items.map((t) => t.compte_id).filter(Boolean))];
      const comptes = await Promise.all(ids.map((id) => base44.entities.Compte.get(id).catch(() => null)));
      const map = {};
      comptes.forEach((c) => { if (c) map[c.id] = c; });
      setComptesById(map);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSemaine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  const tachesParJour = (day) =>
    taches
      .filter((t) => t.echeance === toIso(day))
      .sort((a, b) => (a.heure || "99:99").localeCompare(b.heure || "99:99"));

  const toIcsEvent = (t) => {
    const c = comptesById[t.compte_id];
    return {
      uid: t.id,
      date: t.echeance,
      heure: t.heure,
      dureeMinutes: t.duree_minutes,
      titre: t.titre,
      lieu: c ? [c.adresse, c.code_postal, c.ville].filter(Boolean).join(" ") : "",
      description: c ? `${c.raison_sociale}${c.telephone_1 ? " · " + c.telephone_1 : ""}` : "",
    };
  };

  const exportTache = (t) => {
    downloadIcs(`rdv-${t.id}`, [toIcsEvent(t)]);
    toast({ title: "Export .ics prêt", description: "Ouvrez le fichier téléchargé pour l'ajouter à Outlook." });
  };

  const deleteTache = async (t) => {
    if (!window.confirm(`Supprimer « ${t.titre} » ?`)) return;
    try {
      await base44.entities.Tache.delete(t.id);
      toast({ title: "RDV supprimé" });
      await loadSemaine();
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "La suppression a échoué.", variant: "destructive" });
    }
  };

  const exportSemaine = () => {
    if (taches.length === 0) {
      toast({ title: "Rien à exporter", description: "Aucun RDV planifié cette semaine." });
      return;
    }
    downloadIcs(`rdv-semaine-${toIso(weekStart)}`, taches.map(toIcsEvent));
    toast({ title: "Export réussi", description: "Dans Outlook : Fichier > Ouvrir et exporter > Importer/Exporter, puis sélectionnez ce fichier .ics." });
  };

  return (
    <div className="animate-fade-in">
      <PageTitle subtitle={`${taches.length} RDV cette semaine`}>Calendrier</PageTitle>

      <div className="p-4 lg:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="rounded-lg border border-gd-mist/60 bg-white p-2 hover:bg-gd-ice">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="rounded-lg border border-gd-mist/60 bg-white px-3 py-2 text-xs font-semibold text-gd-blue hover:bg-gd-ice">
              Aujourd'hui
            </button>
            <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="rounded-lg border border-gd-mist/60 bg-white p-2 hover:bg-gd-ice">
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="ml-2 text-sm font-semibold capitalize text-foreground">
              Semaine du {format(days[0], "d", { locale: fr })} au {format(days[6], "d MMMM yyyy", { locale: fr })}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportSemaine} className="flex items-center gap-1.5 rounded-lg border border-gd-mist/60 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-gd-ice">
              <Download className="h-4 w-4" /> Exporter vers Outlook
            </button>
            <button onClick={() => setFormOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-gd-blue px-4 py-2 text-sm font-semibold text-white">
              <Plus className="h-4 w-4" /> Nouveau RDV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gd-mist border-t-gd-blue" />
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 gd-scrollbar-thin">
            {days.map((day) => (
              <JourColonne key={toIso(day)} day={day} taches={tachesParJour(day)} comptesById={comptesById} onExport={exportTache} onDelete={deleteTache} />
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <NouveauRdvModal
          defaultDate={toIso(new Date())}
          onClose={() => setFormOpen(false)}
          onCreated={loadSemaine}
        />
      )}
    </div>
  );
}

function JourColonne({ day, taches, comptesById, onExport, onDelete }) {
  const isToday = isSameDay(day, new Date());
  return (
    <div className={`flex min-w-[230px] flex-1 flex-col rounded-xl border ${isToday ? "border-gd-blue/40 bg-gd-blue/5" : "border-gd-mist/50 bg-white"}`}>
      <div className={`border-b px-3 py-2.5 ${isToday ? "border-gd-blue/20" : "border-gd-mist/40"}`}>
        <div className="text-[11px] font-medium uppercase text-muted-foreground">{format(day, "EEEE", { locale: fr })}</div>
        <div className={`text-sm font-bold ${isToday ? "text-gd-blue" : "text-foreground"}`}>{format(day, "d MMM", { locale: fr })}</div>
      </div>
      <div className="flex-1 space-y-2 p-2">
        {taches.length === 0 ? (
          <p className="py-6 text-center text-[11px] text-muted-foreground">Aucun RDV</p>
        ) : (
          taches.map((t) => {
            const c = comptesById[t.compte_id];
            return (
              <div key={t.id} className="rounded-lg border border-gd-mist/40 bg-white p-2.5 shadow-sm">
                <div className="flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1 text-xs font-bold text-gd-blue">
                    <Clock className="h-3 w-3" /> {t.heure || "—"}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <button onClick={() => onExport(t)} className="text-slate-300 hover:text-gd-blue" title="Exporter vers Outlook (.ics)">
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => onDelete(t)} className="text-slate-300 hover:text-gd-danger" title="Supprimer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-1 truncate text-sm font-semibold">{t.titre}</div>
                {c && (
                  <>
                    <ClientLink compte={c} className="block text-xs font-medium text-gd-blue" />
                    <div className="mt-1 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" /> {c.ville || "—"}
                    </div>
                  </>
                )}
                {c?.telephone_1 && (
                  <a href={`tel:${c.telephone_1.replace(/\s/g, "")}`} className="mt-1.5 flex items-center justify-center gap-1.5 rounded-md bg-gd-ice py-1.5 text-[11px] font-semibold text-gd-blue active:scale-95">
                    <Phone className="h-3 w-3" /> Appeler
                  </a>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function NouveauRdvModal({ defaultDate, onClose, onCreated }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [compte, setCompte] = useState(null);
  const [titre, setTitre] = useState("");
  const [type, setType] = useState("Visite");
  const [date, setDate] = useState(defaultDate);
  const [heure, setHeure] = useState("09:00");
  const [dureeMinutes, setDureeMinutes] = useState(60);
  const [priorite, setPriorite] = useState("Normale");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (search.trim().length < 2 || compte) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await base44.entities.Compte.filter(
          { raison_sociale: { $regex: search.trim(), $options: "i" } },
          { limit: 10, fields: ["raison_sociale", "ville", "telephone_1"] }
        );
        setResults(res.items || res);
      } catch (e) {
        console.error(e);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, compte]);

  const selectCompte = (c) => {
    setCompte(c);
    setTitre(`RDV - ${c.raison_sociale}`);
    setResults([]);
    setSearch(c.raison_sociale);
  };

  const save = async () => {
    if (!compte || !titre || !date) return;
    setSaving(true);
    try {
      await base44.entities.Tache.create({
        compte_id: compte.id,
        titre,
        type,
        echeance: date,
        heure,
        duree_minutes: dureeMinutes,
        priorite,
        statut: "À faire",
      });
      toast({
        title: "RDV planifié",
        description: `${titre} le ${new Date(date).toLocaleDateString("fr-FR")} à ${heure}.`,
      });
      onCreated();
      onClose();
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "Le RDV n'a pas pu être enregistré.", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 lg:items-center lg:p-4" onClick={onClose}>
      <div className="w-full max-w-md animate-slide-up rounded-t-2xl bg-white p-5 lg:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="gd-title text-sm text-gd-blue">Nouveau RDV</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-slate-400" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Compte</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCompte(null); }}
                placeholder="Rechercher un compte…"
                className="h-10 w-full rounded-lg border border-gd-mist/60 pl-9 pr-3 text-sm outline-none focus:border-gd-blue"
              />
            </div>
            {results.length > 0 && (
              <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-gd-mist/40">
                {results.map((c) => (
                  <button key={c.id} onClick={() => selectCompte(c)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gd-ice">
                    <span className="truncate">{c.raison_sociale}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{c.ville}</span>
                  </button>
                ))}
              </div>
            )}
            {compte && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <Check className="h-3.5 w-3.5" /> {compte.raison_sociale} sélectionné
              </div>
            )}
          </div>

          <Input label="Titre" value={titre} onChange={setTitre} />

          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" value={type} onChange={setType} options={TYPES_TACHE} />
            <Select label="Priorité" value={priorite} onChange={setPriorite} options={PRIORITES} />
            <Input label="Date" value={date} onChange={setDate} type="date" />
            <Input label="Heure" value={heure} onChange={setHeure} type="time" />
            <Input label="Durée (min)" value={dureeMinutes} onChange={(v) => setDureeMinutes(Number(v) || 60)} type="number" />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gd-mist/60 py-2.5 text-sm font-medium">Annuler</button>
          <button onClick={save} disabled={saving || !compte || !titre} className="flex-1 rounded-lg bg-gd-blue py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Enregistrement…" : "Planifier"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <input type={type || "text"} value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-lg border border-gd-mist/60 px-3 text-sm outline-none focus:border-gd-blue" />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-lg border border-gd-mist/60 px-3 text-sm outline-none focus:border-gd-blue">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
