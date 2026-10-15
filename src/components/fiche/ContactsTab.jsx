import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Phone, Mail, User, Plus, Star, Pencil } from "lucide-react";

export default function ContactsTab({ compteId, onCount }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compteId]);

  const load = async () => {
    try {
      const res = await base44.entities.Contact.filter({ compte_id: compteId }, { sort: "-decideur", limit: 50 });
      const items = res.items || res;
      setContacts(items);
      onCount?.(items.length);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  if (loading) return <Spinner />;
  if (contacts.length === 0 && !editing) {
    return (
      <div className="rounded-xl border border-dashed border-gd-mist/60 bg-white p-8 text-center">
        <User className="mx-auto h-8 w-8 text-gd-mist" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">Aucun contact enregistré</p>
        <button onClick={() => setEditing({})} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gd-blue px-3 py-2 text-xs font-semibold text-white">
          <Plus className="h-3.5 w-3.5" /> Ajouter un contact
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{contacts.length} contact{contacts.length > 1 ? "s" : ""}</span>
        <button onClick={() => setEditing({})} className="inline-flex items-center gap-1.5 rounded-lg border border-gd-mist/60 bg-white px-3 py-1.5 text-xs font-medium text-gd-blue hover:bg-gd-ice">
          <Plus className="h-3.5 w-3.5" /> Nouveau contact
        </button>
      </div>
      {contacts.map((c) => (
        <div key={c.id} className="rounded-xl border border-gd-mist/40 bg-white p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gd-ice text-gd-blue">
                <User className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{[c.prenom, c.nom].filter(Boolean).join(" ") || "Sans nom"}</span>
                  {c.decideur && (
                    <span className="flex items-center gap-0.5 rounded bg-gd-yellow/20 px-1.5 py-0.5 text-[10px] font-bold text-gd-navy">
                      <Star className="h-2.5 w-2.5 fill-gd-yellow text-gd-yellow" /> Décideur
                    </span>
                  )}
                </div>
                {c.fonction && <div className="text-xs text-muted-foreground">{c.fonction}</div>}
              </div>
            </div>
            <button onClick={() => setEditing(c)} className="rounded-md p-1.5 text-slate-400 hover:bg-gd-ice">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            {c.telephone && <a href={`tel:${c.telephone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 text-gd-blue"><Phone className="h-3 w-3" /> {c.telephone}</a>}
            {c.mobile && <a href={`tel:${c.mobile.replace(/\s/g, "")}`} className="flex items-center gap-1.5 text-gd-blue"><Phone className="h-3 w-3" /> {c.mobile}</a>}
            {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-gd-blue"><Mail className="h-3 w-3" /> {c.email}</a>}
          </div>
          {c.notes && <p className="mt-2 rounded-md bg-gd-ice p-2 text-xs text-muted-foreground">{c.notes}</p>}
        </div>
      ))}
      {editing && <ContactForm contact={editing} compteId={compteId} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function ContactForm({ contact, compteId, onClose, onSaved }) {
  const [form, setForm] = useState({ ...contact, compte_id: compteId });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      if (contact.id) await base44.entities.Contact.update(contact.id, form);
      else await base44.entities.Contact.create(form);
      onSaved();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 lg:items-center lg:p-4" onClick={onClose}>
      <div className="w-full max-w-md animate-slide-up rounded-t-2xl bg-white p-5 lg:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="gd-title mb-4 text-sm text-gd-blue">{contact.id ? "Modifier le contact" : "Nouveau contact"}</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Civilité" value={form.civilite} onChange={(v) => setForm({ ...form, civilite: v })} options={["M.", "Mme", "Dr", "Autre"]} />
          <Field label="Fonction" value={form.fonction} onChange={(v) => setForm({ ...form, fonction: v })} options={["Maire", "Adjoint travaux", "DGS", "Responsable services techniques", "Gérant", "Chef d'équipe", "Autre"]} />
          <Input label="Prénom" value={form.prenom || ""} onChange={(v) => setForm({ ...form, prenom: v })} />
          <Input label="Nom" value={form.nom || ""} onChange={(v) => setForm({ ...form, nom: v })} />
          <Input label="Téléphone" value={form.telephone || ""} onChange={(v) => setForm({ ...form, telephone: v })} type="tel" />
          <Input label="Mobile" value={form.mobile || ""} onChange={(v) => setForm({ ...form, mobile: v })} type="tel" />
          <Input label="Email" value={form.email || ""} onChange={(v) => setForm({ ...form, email: v })} type="email" full />
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.decideur || false} onChange={(e) => setForm({ ...form, decideur: e.target.checked })} className="h-4 w-4 rounded accent-gd-blue" />
            Décideur
          </label>
          <Input label="Notes" value={form.notes || ""} onChange={(v) => setForm({ ...form, notes: v })} full textarea />
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

function Input({ label, value, onChange, type, full, textarea }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className="w-full rounded-lg border border-gd-mist/60 px-3 py-2 text-sm outline-none focus:border-gd-blue" />
      ) : (
        <input type={type || "text"} value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-lg border border-gd-mist/60 px-3 text-sm outline-none focus:border-gd-blue" />
      )}
    </div>
  );
}

function Field({ label, value, onChange, options }) {
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