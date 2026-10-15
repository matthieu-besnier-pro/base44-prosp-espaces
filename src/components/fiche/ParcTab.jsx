import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Wrench, X } from "lucide-react";

export default function ParcTab({ compteId, onCount }) {
  const [equipements, setEquipements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compteId]);

  const load = async () => {
    try {
      const res = await base44.entities.Equipement.filter({ compte_id: compteId }, { sort: "-annee", limit: 50 });
      const items = res.items || res;
      setEquipements(items);
      onCount?.(items.length);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{equipements.length} équipement{equipements.length > 1 ? "s" : ""}</span>
        <button onClick={() => setEditing({})} className="inline-flex items-center gap-1.5 rounded-lg border border-gd-mist/60 bg-white px-3 py-1.5 text-xs font-medium text-gd-blue hover:bg-gd-ice">
          <Plus className="h-3.5 w-3.5" /> Ajouter un équipement
        </button>
      </div>
      {equipements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gd-mist/60 bg-white p-8 text-center">
          <Wrench className="mx-auto h-8 w-8 text-gd-mist" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">Aucun équipement enregistré</p>
          <p className="mt-1 text-xs text-muted-foreground">Le parc installé est le levier de ciblage n°1</p>
        </div>
      ) : (
        equipements.map((e) => (
          <div key={e.id} className="flex items-center gap-3 rounded-xl border border-gd-mist/40 bg-white p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gd-ice text-gd-blue">
              <Wrench className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{e.type_materiel}</div>
              <div className="text-xs text-muted-foreground">
                {[e.marque, e.modele, e.annee && `${e.annee}`].filter(Boolean).join(" · ") || "Sans détails"}
              </div>
            </div>
            {e.etat && (
              <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${ETAT_COLOR[e.etat] || "bg-slate-100 text-slate-600"}`}>
                {e.etat}
              </span>
            )}
            {e.date_renouvellement_estimee && (
              <span className="text-xs text-muted-foreground">Renouv. {e.date_renouvellement_estimee}</span>
            )}
            <button onClick={() => setEditing(e)} className="text-slate-400 hover:text-gd-blue"><Pencil className="h-3.5 w-3.5" /></button>
          </div>
        ))
      )}
      {editing && <EquipForm equip={editing} compteId={compteId} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

const ETAT_COLOR = {
  Bon: "bg-emerald-100 text-emerald-700",
  "À renouveler": "bg-amber-100 text-amber-700",
  HS: "bg-rose-100 text-rose-700",
};

function EquipForm({ equip, compteId, onClose, onSaved }) {
  const [form, setForm] = useState({ ...equip, compte_id: compteId });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      if (equip.id) await base44.entities.Equipement.update(equip.id, form);
      else await base44.entities.Equipement.create(form);
      onSaved();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 lg:items-center lg:p-4" onClick={onClose}>
      <div className="w-full max-w-md animate-slide-up rounded-t-2xl bg-white p-5 lg:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="gd-title text-sm text-gd-blue">{equip.id ? "Modifier l'équipement" : "Nouvel équipement"}</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          <Input label="Type de matériel" value={form.type_materiel || ""} onChange={(v) => setForm({ ...form, type_materiel: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Marque" value={form.marque || ""} onChange={(v) => setForm({ ...form, marque: v })} />
            <Input label="Modèle" value={form.modele || ""} onChange={(v) => setForm({ ...form, modele: v })} />
            <Input label="Année" value={form.annee || ""} onChange={(v) => setForm({ ...form, annee: Number(v) })} type="number" />
            <Select label="État" value={form.etat} onChange={(v) => setForm({ ...form, etat: v })} options={["Bon", "À renouveler", "HS"]} />
          </div>
          <Input label="Date de renouvellement estimée" value={form.date_renouvellement_estimee || ""} onChange={(v) => setForm({ ...form, date_renouvellement_estimee: v })} type="date" />
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gd-mist/60 py-2.5 text-sm font-medium">Annuler</button>
          <button onClick={save} disabled={saving} className="flex-1 rounded-lg bg-gd-blue py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Enregistrement…" : "Enregistrer"}
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
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-lg border border-gd-mist/60 px-3 text-sm outline-none focus:border-gd-blue">
        <option value="">—</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
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