import { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  FAMILLES, SEGMENTS, DEPARTEMENTS, STATUTS_COMPTE, POTENTIELS,
  CONCESSIONS, SOURCES, CONSENTEMENTS,
} from "@/lib/crm-constants";
import { calculerScore } from "@/lib/crm-helpers";
import { ExternalLink, Save } from "lucide-react";

export default function InfosTab({ compte, onUpdate }) {
  const [form, setForm] = useState({ ...compte });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.Compte.update(compte.id, form);
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <Section title="Coordonnées">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Raison sociale" value={form.raison_sociale || ""} onChange={(v) => setForm({ ...form, raison_sociale: v })} full />
          <Input label="SIREN" value={form.siren || ""} onChange={(v) => setForm({ ...form, siren: v })} />
          <Input label="Site web" value={form.site_web || ""} onChange={(v) => setForm({ ...form, site_web: v })} />
          <Input label="Adresse" value={form.adresse || ""} onChange={(v) => setForm({ ...form, adresse: v })} full />
          <Input label="Code postal" value={form.code_postal || ""} onChange={(v) => setForm({ ...form, code_postal: v })} />
          <Input label="Ville" value={form.ville || ""} onChange={(v) => setForm({ ...form, ville: v })} />
          <Input label="Téléphone 1" value={form.telephone_1 || ""} onChange={(v) => setForm({ ...form, telephone_1: v })} type="tel" />
          <Input label="Téléphone 2" value={form.telephone_2 || ""} onChange={(v) => setForm({ ...form, telephone_2: v })} type="tel" />
          <Input label="Email" value={form.email || ""} onChange={(v) => setForm({ ...form, email: v })} type="email" full />
        </div>
        {form.siren && (
          <a href={`https://annuaire-entreprises.data.gouv.fr/entreprise/${form.siren}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-gd-blue hover:underline">
            <ExternalLink className="h-3.5 w-3.5" /> Voir sur l'annuaire des entreprises
          </a>
        )}
      </Section>

      <Section title="Classification">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Famille" value={form.famille} onChange={(v) => setForm({ ...form, famille: v })} options={FAMILLES} />
          <Select label="Segment" value={form.segment} onChange={(v) => setForm({ ...form, segment: v })} options={SEGMENTS} />
          <Select label="Département" value={form.departement} onChange={(v) => setForm({ ...form, departement: v })} options={DEPARTEMENTS.map((d) => `${d.code} ${d.nom}`)} rawOptions={DEPARTEMENTS.map((d) => d.code)} />
          <Select label="Statut" value={form.statut} onChange={(v) => setForm({ ...form, statut: v })} options={STATUTS_COMPTE} />
          <Select label="Potentiel" value={form.potentiel} onChange={(v) => setForm({ ...form, potentiel: v })} options={POTENTIELS} />
          <Input label="Taille" value={form.taille || ""} onChange={(v) => setForm({ ...form, taille: v })} />
          <Select label="Concession" value={form.concession_rattachement} onChange={(v) => setForm({ ...form, concession_rattachement: v })} options={CONCESSIONS} />
          <Select label="Source" value={form.source} onChange={(v) => setForm({ ...form, source: v })} options={SOURCES} />
          <Input label="Activité (détail)" value={form.activite_detail || ""} onChange={(v) => setForm({ ...form, activite_detail: v })} full />
          <Select label="Consentement RGPD" value={form.consentement_rgpd} onChange={(v) => setForm({ ...form, consentement_rgpd: v })} options={CONSENTEMENTS} />
        </div>
      </Section>

      <Section title="Prospection">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Fournisseur actuel" value={form.fournisseur_actuel || ""} onChange={(v) => setForm({ ...form, fournisseur_actuel: v })} full />
          <Input label="Mois de vote du budget" value={form.mois_vote_budget || ""} onChange={(v) => setForm({ ...form, mois_vote_budget: v })} />
          <Input label="Tags (séparés par virgules)" value={(form.tags || []).join(", ")} onChange={(v) => setForm({ ...form, tags: v.split(",").map((s) => s.trim()).filter(Boolean) })} full />
        </div>
      </Section>

      {form.resume_ia && (
        <Section title="Synthèse IA">
          <div className="rounded-lg bg-gd-yellow/5 border border-gd-yellow/20 p-3">
            <p className="text-sm text-foreground/80">{form.resume_ia}</p>
          </div>
        </Section>
      )}

      <div className="sticky bottom-20 flex justify-end lg:bottom-4">
        <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-gd-blue px-5 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50">
          <Save className="h-4 w-4" /> {saved ? "Enregistré ✓" : saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-xl border border-gd-mist/40 bg-white p-4">
      <h3 className="gd-title mb-3 text-sm text-gd-blue">{title}</h3>
      {children}
    </section>
  );
}

function Input({ label, value, onChange, type, full }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <input type={type || "text"} value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-lg border border-gd-mist/60 px-3 text-sm outline-none focus:border-gd-blue" />
    </div>
  );
}

function Select({ label, value, onChange, options, rawOptions }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-lg border border-gd-mist/60 px-3 text-sm outline-none focus:border-gd-blue">
        <option value="">—</option>
        {options.map((o, i) => <option key={o} value={rawOptions ? rawOptions[i] : o}>{o}</option>)}
      </select>
    </div>
  );
}