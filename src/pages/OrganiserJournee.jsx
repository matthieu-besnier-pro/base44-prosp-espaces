import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PageTitle from "@/components/PageTitle";
import { StatutBadge, PotentielBadge, ScoreBadge } from "@/components/badges";
import ClientLink from "@/components/ClientLink";
import { SEGMENTS, DEPARTEMENTS, POTENTIELS, STATUTS_COMPTE } from "@/lib/crm-constants";
import { toast } from "@/components/ui/use-toast";
import { optimiserOrdreTrajet, ouvrirGoogleMaps, ouvrirWaze } from "@/lib/crm-helpers";
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from "react-leaflet";
import {
  Search, MapPin, Phone, Plus, X, ChevronUp, ChevronDown, Route, CalendarDays, Check, Sparkles, Shuffle,
} from "lucide-react";

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

export default function OrganiserJournee() {
  const [date, setDate] = useState(todayIso());
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ segment: "", departement: "", potentiel: "", statut: "" });
  const [candidats, setCandidats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState([]); // comptes de la tournée, dans l'ordre
  const [saving, setSaving] = useState(false);
  const [iaSecteur, setIaSecteur] = useState("");
  const [iaNombre, setIaNombre] = useState(5);
  const [iaLoading, setIaLoading] = useState(false);

  const buildQuery = useMemo(() => {
    return () => {
      const q = {};
      if (filters.segment) q.segment = filters.segment;
      if (filters.departement) q.departement = filters.departement;
      if (filters.potentiel) q.potentiel = filters.potentiel;
      if (filters.statut) q.statut = filters.statut;
      if (search.trim().length >= 2) {
        q.$or = [
          { raison_sociale: { $regex: search.trim(), $options: "i" } },
          { ville: { $regex: search.trim(), $options: "i" } },
        ];
      }
      return q;
    };
  }, [filters, search]);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await base44.entities.Compte.filter(buildQuery(), {
          sort: "-score",
          limit: 100,
          fields: [
            "raison_sociale", "ville", "departement", "segment", "statut", "potentiel",
            "score", "telephone_1", "latitude", "longitude",
          ],
        });
        setCandidats(res.items || res);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }, search ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, search]);

  const selectedIds = useMemo(() => new Set(selection.map((c) => c.id)), [selection]);

  const addToSelection = (compte) => {
    if (selectedIds.has(compte.id)) return;
    setSelection((prev) => [...prev, compte]);
  };

  const removeFromSelection = (id) => {
    setSelection((prev) => prev.filter((c) => c.id !== id));
  };

  const moveSelection = (index, dir) => {
    setSelection((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const positions = selection
    .filter((c) => c.latitude && c.longitude)
    .map((c) => [c.latitude, c.longitude]);

  const mapCenter = positions.length > 0 ? positions[0] : [46.0, 0.3];

  const optimiserOrdre = () => {
    if (selection.filter((c) => c.latitude && c.longitude).length < 3) {
      toast({ title: "Rien à optimiser", description: "Il faut au moins 3 clients géolocalisés." });
      return;
    }
    setSelection((prev) => optimiserOrdreTrajet(prev));
    toast({ title: "Ordre optimisé", description: "La tournée a été réordonnée pour limiter les trajets." });
  };

  const exporterGoogleMaps = () => {
    if (!ouvrirGoogleMaps(selection)) {
      toast({ title: "Rien à exporter", description: "Aucun client géolocalisé dans la tournée." });
    }
  };

  const exporterWaze = () => {
    const avecCoords = selection.filter((c) => c.latitude && c.longitude);
    if (avecCoords.length === 0) {
      toast({ title: "Rien à exporter", description: "Aucun client géolocalisé dans la tournée." });
      return;
    }
    if (avecCoords.length > 1) {
      toast({ title: "Waze : une étape à la fois", description: "Waze ne gère pas les tournées multi-étapes : navigation lancée vers le premier client, recommencez pour chaque étape suivante." });
    }
    ouvrirWaze(selection);
  };

  const genererTourneeIA = async () => {
    setIaLoading(true);
    try {
      const q = {};
      if (iaSecteur) q.departement = iaSecteur;
      const res = await base44.entities.Compte.filter(q, {
        sort: "-score",
        limit: iaNombre,
        fields: [
          "raison_sociale", "ville", "departement", "segment", "statut", "potentiel",
          "score", "telephone_1", "latitude", "longitude",
        ],
      });
      const items = res.items || res;
      setSelection(items);
      toast({
        title: "Tournée proposée par l'IA",
        description: items.length > 0
          ? `${items.length} client${items.length > 1 ? "s" : ""} à plus fort potentiel sélectionné${items.length > 1 ? "s" : ""}.`
          : "Aucun client ne correspond à ce secteur pour le moment.",
      });
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "La proposition IA a échoué.", variant: "destructive" });
    }
    setIaLoading(false);
  };

  const handlePlanifier = async () => {
    if (selection.length === 0) return;
    setSaving(true);
    try {
      for (const compte of selection) {
        await base44.entities.Tache.create({
          compte_id: compte.id,
          titre: `Visite - ${compte.raison_sociale}`,
          type: "Visite",
          echeance: date,
          priorite: "Normale",
          statut: "À faire",
        });
      }
      toast({
        title: "Tournée planifiée",
        description: `${selection.length} visite${selection.length > 1 ? "s" : ""} ajoutée${selection.length > 1 ? "s" : ""} pour le ${new Date(date).toLocaleDateString("fr-FR")}.`,
      });
      setSelection([]);
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "La tournée n'a pas pu être enregistrée.", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <PageTitle subtitle="Sélectionnez les clients à visiter et planifiez votre tournée">
        Organiser une journée de prospection
      </PageTitle>

      <div className="p-4 lg:p-8 lg:pb-0">
        <div className="rounded-xl border border-gd-yellow/30 bg-gd-yellow/5 p-4">
          <div className="flex items-center gap-2 text-gd-navy">
            <Sparkles className="h-5 w-5 text-gd-yellow" />
            <h2 className="gd-title text-sm">Proposition de tournée par l'IA</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            L'IA sélectionne automatiquement les clients à plus fort score de priorité pour composer votre tournée.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Secteur</label>
              <div className="relative">
                <select
                  value={iaSecteur}
                  onChange={(e) => setIaSecteur(e.target.value)}
                  className="h-11 appearance-none rounded-lg border border-gd-mist/60 bg-white pl-3 pr-7 text-sm outline-none focus:border-gd-blue"
                >
                  <option value="">Tous secteurs</option>
                  {DEPARTEMENTS.map((d) => (
                    <option key={d.code} value={d.code}>{d.code} {d.nom}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre de RDV</label>
              <input
                type="number"
                min={1}
                max={20}
                value={iaNombre}
                onChange={(e) => setIaNombre(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                className="h-11 w-24 rounded-lg border border-gd-mist/60 bg-white px-3 text-sm outline-none focus:border-gd-blue"
              />
            </div>
            <button
              onClick={genererTourneeIA}
              disabled={iaLoading}
              className="flex h-11 items-center gap-2 rounded-lg bg-gd-navy px-4 text-sm font-bold text-white shadow-sm active:scale-[0.98] disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {iaLoading ? "Génération…" : "Générer avec l'IA"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_380px] lg:p-8">
        {/* Candidats */}
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un client, une ville…"
                className="h-11 w-full rounded-lg border border-gd-mist/60 bg-white pl-9 pr-3 text-sm outline-none focus:border-gd-blue focus:ring-2 focus:ring-gd-blue/10"
              />
            </div>
            <FilterSelect label="Segment" value={filters.segment} onChange={(v) => setFilters({ ...filters, segment: v })} options={SEGMENTS} />
            <FilterSelect label="Département" value={filters.departement} onChange={(v) => setFilters({ ...filters, departement: v })} options={DEPARTEMENTS.map((d) => `${d.code} ${d.nom}`)} rawOptions={DEPARTEMENTS.map((d) => d.code)} />
            <FilterSelect label="Potentiel" value={filters.potentiel} onChange={(v) => setFilters({ ...filters, potentiel: v })} options={POTENTIELS} />
            <FilterSelect label="Statut" value={filters.statut} onChange={(v) => setFilters({ ...filters, statut: v })} options={STATUTS_COMPTE} />
          </div>

          {!loading && (
            <div className="mb-2 text-xs font-semibold text-muted-foreground">
              {candidats.length} client{candidats.length > 1 ? "s" : ""} trouvé{candidats.length > 1 ? "s" : ""}
              {candidats.length >= 100 && " (limité aux 100 premiers, affinez les filtres)"}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gd-mist border-t-gd-blue" />
            </div>
          ) : candidats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <Route className="h-10 w-10 text-gd-mist" />
              <p className="mt-3 text-sm">Aucun client ne correspond à ces critères</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {candidats.map((c) => {
                const added = selectedIds.has(c.id);
                return (
                  <div key={c.id} className="flex items-center gap-2 rounded-xl border border-gd-mist/50 bg-white p-3 shadow-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <ClientLink compte={c} className="truncate text-sm font-semibold" newTab />
                        <ScoreBadge score={c.score} />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{c.ville || "—"} {c.departement ? `(${c.departement})` : ""}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <StatutBadge statut={c.statut || "À qualifier"} />
                        <PotentielBadge potentiel={c.potentiel} />
                      </div>
                    </div>
                    <button
                      onClick={() => addToSelection(c)}
                      disabled={added}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        added ? "bg-emerald-100 text-emerald-600" : "bg-gd-blue text-white hover:bg-gd-navy"
                      }`}
                      title={added ? "Déjà dans la tournée" : "Ajouter à la tournée"}
                    >
                      {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tournée du jour */}
        <div className="flex flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-gd-mist/50 bg-white p-3">
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" /> Date de la tournée
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-gd-mist/60 bg-white px-3 text-sm outline-none focus:border-gd-blue"
            />
          </div>

          {positions.length > 1 && (
            <div className="h-48 overflow-hidden rounded-xl border border-gd-mist/50">
              <MapContainer center={mapCenter} zoom={9} className="h-full w-full">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                <Polyline positions={positions} pathOptions={{ color: "#2563eb", weight: 3, opacity: 0.6 }} />
                {selection.filter((c) => c.latitude && c.longitude).map((c, i) => (
                  <CircleMarker key={c.id} center={[c.latitude, c.longitude]} radius={7} pathOptions={{ color: "#2563eb", fillOpacity: 0.9 }}>
                    <Popup>
                      <div className="text-xs">
                        <strong>{i + 1}. </strong>
                        <ClientLink compte={c} className="font-bold" newTab />
                        <br />{c.ville}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          )}

          <div className="rounded-xl border border-gd-mist/50 bg-white">
            <header className="flex items-center gap-2 border-b border-gd-mist/40 px-4 py-3 text-gd-blue">
              <Route className="h-5 w-5" strokeWidth={2.2} />
              <h2 className="gd-title text-sm">Tournée du jour</h2>
              <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {selection.length}
              </span>
            </header>
            <div className="flex flex-wrap gap-2 border-b border-gd-mist/40 p-2">
              <button
                onClick={optimiserOrdre}
                disabled={selection.length < 3}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gd-mist/60 bg-white px-2 py-2 text-xs font-medium text-slate-600 hover:bg-gd-ice disabled:opacity-40 disabled:hover:bg-white"
                title="Réordonne la tournée pour limiter les trajets"
              >
                <Shuffle className="h-3.5 w-3.5" /> Optimiser l'ordre
              </button>
              <button
                onClick={exporterGoogleMaps}
                disabled={selection.length === 0}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gd-mist/60 bg-white px-2 py-2 text-xs font-medium text-slate-600 hover:bg-gd-ice disabled:opacity-40 disabled:hover:bg-white"
              >
                <MapPin className="h-3.5 w-3.5" /> Google Maps
              </button>
              <button
                onClick={exporterWaze}
                disabled={selection.length === 0}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gd-mist/60 bg-white px-2 py-2 text-xs font-medium text-slate-600 hover:bg-gd-ice disabled:opacity-40 disabled:hover:bg-white"
              >
                <Route className="h-3.5 w-3.5" /> Waze
              </button>
            </div>
            {selection.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                Ajoutez des clients depuis la liste à gauche pour composer votre tournée.
              </p>
            ) : (
              <div className="divide-y divide-gd-mist/30">
                {selection.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-2 px-4 py-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gd-ice text-xs font-bold text-gd-blue">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <ClientLink compte={c} className="truncate text-sm font-semibold" newTab />
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{c.ville || "—"}</span>
                        {c.telephone_1 && (
                          <>
                            <span className="text-slate-300">·</span>
                            <Phone className="h-3 w-3" />
                            <span>{c.telephone_1}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col">
                      <button onClick={() => moveSelection(i, -1)} disabled={i === 0} className="text-slate-400 hover:text-gd-blue disabled:opacity-30">
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button onClick={() => moveSelection(i, 1)} disabled={i === selection.length - 1} className="text-slate-400 hover:text-gd-blue disabled:opacity-30">
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                    <button onClick={() => removeFromSelection(c.id)} className="shrink-0 text-slate-300 hover:text-gd-danger">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handlePlanifier}
            disabled={selection.length === 0 || saving}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gd-yellow text-sm font-bold text-gd-black shadow-sm active:scale-[0.98] disabled:opacity-40"
          >
            {saving ? "Enregistrement…" : `Planifier la tournée (${selection.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, rawOptions }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 appearance-none rounded-lg border border-gd-mist/60 bg-white pl-3 pr-7 text-sm outline-none focus:border-gd-blue"
        title={label}
      >
        <option value="">{label}</option>
        {options.map((o, i) => (
          <option key={o} value={rawOptions ? rawOptions[i] : o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
