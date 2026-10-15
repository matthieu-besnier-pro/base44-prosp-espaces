import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageTitle from "@/components/PageTitle";
import { formatMontant } from "@/lib/crm-constants";
import { Plus, Megaphone, X } from "lucide-react";

export default function Campagnes() {
  const [campagnes, setCampagnes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await base44.entities.Campagne.filter({}, { sort: "-created_date", limit: 50 });
      setCampagnes(res.items || res);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="animate-fade-in">
      <PageTitle subtitle="Pilotage des campagnes de prospection">Campagnes</PageTitle>
      <div className="p-4 lg:p-8">
        <div className="mb-4 flex justify-end">
          <button onClick={() => setEditing({})} className="inline-flex items-center gap-1.5 rounded-lg bg-gd-blue px-3 py-2 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" /> Nouvelle campagne
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gd-mist border-t-gd-blue" />
          </div>
        ) : campagnes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gd-mist/60 bg-white p-12 text-center">
            <Megaphone className="mx-auto h-10 w-10 text-gd-mist" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">Aucune campagne</p>
            <p className="mt-1 text-xs text-muted-foreground">Créez une campagne pour cibler un segment</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {campagnes.map((c) => (
              <div key={c.id} className="rounded-xl border border-gd-mist/40 bg-white p-4">
                <h3 className="text-sm font-semibold">{c.nom}</h3>
                {c.periode && <div className="mt-0.5 text-xs text-muted-foreground">{c.periode}</div>}
                {c.objectif && <p className="mt-2 text-xs text-foreground/70">{c.objectif}</p>}
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <Stat label="Ciblés" value={c.comptes_cibles || 0} />
                  <Stat label="RDV" value={c.rdv || 0} />
                  <Stat label="CA" value={formatMontant(c.ca_genere).replace("€", "").trim()} />
                </div>
              </div>
            ))}
          </div>
        )}
        {editing && <CampagneForm camp={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-gd-ice p-2">
      <div className="gd-tabular text-sm font-bold text-gd-blue">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function CampagneForm({ camp, onClose, onSaved }) {
  const [form, setForm] = useState({ ...camp });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      if (camp.id) await base44.entities.Campagne.update(camp.id, form);
      else await base44.entities.Campagne.create(form);
      onSaved();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 lg:items-center lg:p-4" onClick={onClose}>
      <div className="w-full max-w-md animate-slide-up rounded-t-2xl bg-white p-5 lg:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="gd-title text-sm text-gd-blue">{camp.id ? "Modifier" : "Nouvelle campagne"}</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nom</label>
            <input value={form.nom || ""} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="h-10 w-full rounded-lg border border-gd-mist/60 px-3 text-sm outline-none focus:border-gd-blue" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Période</label>
            <input value={form.periode || ""} onChange={(e) => setForm({ ...form, periode: e.target.value })} placeholder="ex. Oct 2026 - Déc 2026" className="h-10 w-full rounded-lg border border-gd-mist/60 px-3 text-sm outline-none focus:border-gd-blue" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Cible (description du filtre)</label>
            <input value={form.cible || ""} onChange={(e) => setForm({ ...form, cible: e.target.value })} placeholder="ex. Communes 79 > 2000 hab." className="h-10 w-full rounded-lg border border-gd-mist/60 px-3 text-sm outline-none focus:border-gd-blue" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Objectif</label>
            <textarea value={form.objectif || ""} onChange={(e) => setForm({ ...form, objectif: e.target.value })} rows={2} className="w-full rounded-lg border border-gd-mist/60 px-3 py-2 text-sm outline-none focus:border-gd-blue" />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gd-mist/60 py-2.5 text-sm font-medium">Annuler</button>
          <button onClick={save} disabled={saving} className="flex-1 rounded-lg bg-gd-blue py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}