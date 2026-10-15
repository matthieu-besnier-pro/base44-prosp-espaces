import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { formatMontant } from "@/lib/crm-constants";
import { GAMMES, ETAPES_OPPORTUNITE, PROBABILITE_ETAPE } from "@/lib/crm-constants";
import { Plus, Pencil, TrendingUp, X } from "lucide-react";

export default function OpportunitesTab({ compteId }) {
  const [opps, setOpps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  useEffect(() => { load(); }, [compteId]);

  const load = async () => {
    try {
      const res = await base44.entities.Opportunite.filter({ compte_id: compteId }, { sort: "-date_cloture_prevue", limit: 50 });
      setOpps(res.items || res);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setEditing({})} className="inline-flex items-center gap-1.5 rounded-lg border border-gd-mist/60 bg-white px-3 py-1.5 text-xs font-medium text-gd-blue hover:bg-gd-ice">
          <Plus className="h-3.5 w-3.5" /> Nouvelle opportunité
        </button>
      </div>
      {opps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gd-mist/60 bg-white p-8 text-center">
          <TrendingUp className="mx-auto h-8 w-8 text-gd-mist" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">Aucune opportunité</p>
        </div>
      ) : (
        opps.map((o) => (
          <div key={o.id} className="rounded-xl border border-gd-mist/40 bg-white p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold">{o.nom}</h4>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{o.gamme}</span>
                  <span className={`rounded px-1.5 py-0.5 font-medium ${ETAPE_COLOR[o.etape] || "bg-slate-100 text-slate-600"}`}>{o.etape}</span>
                  <span>{PROBABILITE_ETAPE[o.etape]}%</span>
                </div>
              </div>
              <div className="text-right">
                <div className="gd-tabular text-lg font-bold text-gd-blue">{formatMontant(o.montant_ht)}</div>
                <button onClick={() => setEditing(o)} className="mt-1 text-slate-400 hover:text-gd-blue"><Pencil className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {o.date_cloture_prevue && <span>Clôture prévue : {o.date_cloture_prevue}</span>}
              {o.motif_perte && <span className="text-gd-danger">Motif : {o.motif_perte}</span>}
            </div>
          </div>
        ))
      )}
      {editing && <OppForm opp={editing} compteId={compteId} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

const ETAPE_COLOR = {
  Détection: "bg-slate-100 text-slate-600",
  "Besoin qualifié": "bg-blue-100 text-blue-700",
  Démo: "bg-cyan-100 text-cyan-700",
  "Devis envoyé": "bg-amber-100 text-amber-700",
  Négociation: "bg-violet-100 text-violet-700",
  Gagné: "bg-emerald-100 text-emerald-700",
  Perdu: "bg-rose-100 text-rose-700",
};

function OppForm({ opp, compteId, onClose, onSaved }) {
  const [form, setForm] = useState({ ...opp, compte_id: compteId, probabilite: opp.probabilite ?? PROBABILITE_ETAPE[opp.etape] ?? 10 });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const data = { ...form, probabilite: PROBABILITE_ETAPE[form.etape] ?? form.probabilite };
    try {
      if (opp.id) await base44.entities.Opportunite.update(opp.id, data);
      else await base44.entities.Opportunite.create(data);
      onSaved();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 lg:items-center lg:p-4" onClick={onClose}>
      <div className="w-full max-w-md animate-slide-up rounded-t-2xl bg-white p-5 lg:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="gd-title text-sm text-gd-blue">{opp.id ? "Modifier l'opportunité" : "Nouvelle opportunité"}</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          <Input label="Nom" value={form.nom || ""} onChange={(v) => setForm({ ...form, nom: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Gamme" value={form.gamme} onChange={(v) => setForm({ ...form, gamme: v })} options={GAMMES} />
            <Select label="Étape" value={form.etape} onChange={(v) => setForm({ ...form, etape: v })} options={ETAPES_OPPORTUNITE} />
            <Input label="Montant HT (€)" value={form.montant_ht || ""} onChange={(v) => setForm({ ...form, montant_ht: Number(v) })} type="number" />
            <Input label="Clôture prévue" value={form.date_cloture_prevue || ""} onChange={(v) => setForm({ ...form, date_cloture_prevue: v })} type="date" />
          </div>
          {form.etape === "Perdu" && (
            <Select label="Motif de perte" value={form.motif_perte} onChange={(v) => setForm({ ...form, motif_perte: v })} options={["Prix", "Concurrent", "Budget reporté", "Marché public perdu", "Autre"]} />
          )}
          <Input label="Échéance budgétaire" value={form.echeance_budgetaire || ""} onChange={(v) => setForm({ ...form, echeance_budgetaire: v })} />
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