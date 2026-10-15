import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import ClientLink from "@/components/ClientLink";
import { TYPES_INTERACTION, RESULTATS_INTERACTION } from "@/lib/crm-constants";
import { Search, X, Mic, Phone, Check } from "lucide-react";

export default function SaisieExpress({ open, onClose, presetCompteId }) {
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ type: "Appel", resultat: "", compte_rendu: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setSearch("");
      setSelected(null);
      setForm({ type: "Appel", resultat: "", compte_rendu: "" });
      setSaved(false);
      if (presetCompteId) {
        (async () => {
          try {
            const c = await base44.entities.Compte.get(presetCompteId);
            setSelected(c);
            setStep(2);
          } catch (e) { console.error(e); }
        })();
      }
    }
  }, [open, presetCompteId]);

  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await base44.entities.Compte.filter(
          { raison_sociale: { $regex: search, $options: "i" } },
          { limit: 10, fields: ["raison_sociale", "ville", "telephone_1", "departement"] }
        );
        setResults(res.items || res);
      } catch (e) { console.error(e); }
    }, 300);
  }, [search]);

  const save = async () => {
    if (!selected || !form.resultat) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await base44.entities.Interaction.create({
        compte_id: selected.id,
        type: form.type,
        date_heure: now,
        resultat: form.resultat,
        compte_rendu: form.compte_rendu,
        statut_validation: "Validé",
      });

      // Auto-create next task based on result
      const today = new Date();
      let tache = null;
      let statutUpdate = {};

      if (form.resultat === "Pas joignable") {
        const d = new Date(today); d.setDate(d.getDate() + 2);
        tache = { titre: "Rappeler", type: "Rappel", echeance: d.toISOString().split("T")[0], priorite: "Normale", statut: "À faire" };
      } else if (form.resultat === "À rappeler") {
        const d = new Date(today); d.setDate(d.getDate() + 3);
        tache = { titre: "Rappeler", type: "Rappel", echeance: d.toISOString().split("T")[0], priorite: "Normale", statut: "À faire" };
      } else if (form.resultat === "Devis demandé") {
        const d = new Date(today); d.setDate(d.getDate() + 1);
        tache = { titre: "Envoyer devis", type: "Envoi devis", echeance: d.toISOString().split("T")[0], priorite: "Haute", statut: "À faire" };
        await base44.entities.Opportunite.create({
          compte_id: selected.id,
          nom: `Devis ${selected.raison_sociale}`,
          gamme: "Tondeuses autoportées",
          etape: "Devis envoyé",
          montant_ht: 0,
        });
        statutUpdate = { statut: "Offre en cours" };
      } else if (form.resultat === "RDV pris") {
        statutUpdate = { statut: "RDV planifié" };
      } else if (form.resultat === "Intéressé") {
        statutUpdate = { statut: "Contacté" };
      } else if (form.resultat === "Pas intéressé") {
        statutUpdate = { statut: "Contacté" };
      }

      if (tache) await base44.entities.Tache.create({ ...tache, compte_id: selected.id });

      const updateData = { date_dernier_contact: now.split("T")[0], ...statutUpdate };
      await base44.entities.Compte.update(selected.id, updateData);

      setSaved(true);
      setTimeout(() => { onClose(); }, 1200);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 lg:items-center lg:p-4" onClick={onClose}>
      <div className="w-full max-w-md animate-slide-up rounded-t-2xl bg-white p-5 lg:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="gd-title text-sm text-gd-blue">Saisie express</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-slate-400" /></button>
        </div>

        {saved ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-7 w-7 text-emerald-600" />
            </div>
            <p className="mt-3 text-sm font-semibold">Interaction enregistrée</p>
          </div>
        ) : step === 1 ? (
          <div>
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un compte…"
                className="h-11 w-full rounded-lg border border-gd-mist/60 bg-gd-ice pl-9 pr-3 text-sm outline-none focus:border-gd-blue"
              />
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {results.map((c) => (
                <button key={c.id} onClick={() => { setSelected(c); setStep(2); }} className="flex w-full items-center gap-2 rounded-lg p-2.5 text-left hover:bg-gd-ice">
                  <Phone className="h-4 w-4 text-gd-blue" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{c.raison_sociale}</div>
                    <div className="truncate text-xs text-muted-foreground">{c.ville} ({c.departement})</div>
                  </div>
                </button>
              ))}
              {search.length >= 2 && results.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">Aucun résultat</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-gd-ice p-3">
              <ClientLink compte={selected} className="text-sm font-semibold" newTab />
              <div className="text-xs text-muted-foreground">{selected.ville} ({selected.departement})</div>
              {selected.telephone_1 && (
                <a href={`tel:${selected.telephone_1.replace(/\s/g, "")}`} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-gd-blue">
                  <Phone className="h-3 w-3" /> {selected.telephone_1}
                </a>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Type d'interaction</label>
              <div className="flex flex-wrap gap-1.5">
                {TYPES_INTERACTION.map((t) => (
                  <button key={t} onClick={() => setForm({ ...form, type: t })} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${form.type === t ? "bg-gd-blue text-white" : "bg-gd-ice text-slate-600"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Résultat</label>
              <div className="grid grid-cols-2 gap-1.5">
                {RESULTATS_INTERACTION.map((r) => (
                  <button key={r} onClick={() => setForm({ ...form, resultat: r })} className={`rounded-lg px-3 py-2.5 text-xs font-semibold ${form.resultat === r ? "bg-gd-yellow text-gd-black" : "bg-gd-ice text-slate-600"}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Compte-rendu</label>
              <textarea value={form.compte_rendu} onChange={(e) => setForm({ ...form, compte_rendu: e.target.value })} rows={2} placeholder="Dictée ou saisie libre…" className="w-full rounded-lg border border-gd-mist/60 px-3 py-2 text-sm outline-none focus:border-gd-blue" />
            </div>

            <button onClick={save} disabled={!form.resultat || saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gd-blue py-3 text-sm font-bold text-white disabled:opacity-50">
              {saving ? "Enregistrement…" : "Valider"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}