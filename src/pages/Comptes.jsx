import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageTitle from "@/components/PageTitle";
import { StatutBadge, PotentielBadge, ScoreBadge, SegmentBadge } from "@/components/badges";
import {
  FAMILLES, SEGMENTS, DEPARTEMENTS, POTENTIELS, STATUTS_COMPTE,
} from "@/lib/crm-constants";
import { exportCsv, deptLabel } from "@/lib/crm-helpers";
import {
  Search, SlidersHorizontal, Download, MapPin, Phone, Building2, X, ChevronDown,
} from "lucide-react";

const PAGE_SIZE = 50;

export default function Comptes() {
  const navigate = useNavigate();
  const [comptes, setComptes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    famille: "",
    segment: "",
    departement: "",
    statut: "",
    potentiel: "",
    sansTel: false,
    jamaisContacte: false,
  });
  const [showFilters, setShowFilters] = useState(false);

  const buildQuery = useMemo(() => {
    return () => {
      const q = {};
      if (filters.famille) q.famille = filters.famille;
      if (filters.segment) q.segment = filters.segment;
      if (filters.departement) q.departement = filters.departement;
      if (filters.statut) q.statut = filters.statut;
      if (filters.potentiel) q.potentiel = filters.potentiel;
      if (filters.sansTel) q.telephone_1 = { $exists: false };
      if (filters.jamaisContacte) q.date_dernier_contact = { $exists: false };
      if (search.trim().length >= 2) {
        q.$or = [
          { raison_sociale: { $regex: search.trim(), $options: "i" } },
          { ville: { $regex: search.trim(), $options: "i" } },
          { siren: { $regex: search.trim(), $options: "i" } },
        ];
      }
      return q;
    };
  }, [filters, search]);

  const loadComptes = async (resetCursor = null) => {
    setLoading(true);
    try {
      const q = buildQuery();
      const [page, count] = await Promise.all([
        base44.entities.Compte.filter(q, {
          sort: "-score",
          limit: PAGE_SIZE,
          cursor: resetCursor,
          fields: ["raison_sociale", "ville", "code_postal", "departement", "segment", "famille", "statut", "potentiel", "score", "telephone_1"],
        }),
        base44.entities.Compte.count(q),
      ]);
      setComptes(resetCursor ? [...comptes, ...page.items] : page.items);
      setCursor(page.next_cursor);
      setHasMore(page.has_more);
      setTotal(count);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(() => loadComptes(null), search ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, search]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const handleExport = () => {
    exportCsv(comptes, [
      { label: "Raison sociale", get: (r) => r.raison_sociale },
      { label: "Famille", get: (r) => r.famille },
      { label: "Segment", get: (r) => r.segment },
      { label: "Département", get: (r) => deptLabel(r.departement) },
      { label: "Ville", get: (r) => r.ville },
      { label: "Téléphone", get: (r) => r.telephone_1 },
      { label: "Email", get: (r) => r.email },
      { label: "Statut", get: (r) => r.statut },
      { label: "Potentiel", get: (r) => r.potentiel },
      { label: "Score", get: (r) => r.score },
    ], "comptes.csv");
  };

  return (
    <div className="animate-fade-in">
      <PageTitle subtitle={`${total} compte${total > 1 ? "s" : ""}`}>
        Comptes
      </PageTitle>

      <div className="p-4 lg:p-8">
        {/* Search + filter bar */}
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (nom, ville, SIREN)…"
              className="h-11 w-full rounded-lg border border-gd-mist/60 bg-white pl-9 pr-3 text-sm outline-none focus:border-gd-blue focus:ring-2 focus:ring-gd-blue/10"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative flex h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium ${
              showFilters || activeFilterCount ? "border-gd-blue bg-gd-blue text-white" : "border-gd-mist/60 bg-white text-slate-600"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filtres</span>
            {activeFilterCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gd-yellow text-[10px] font-bold text-gd-black">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={handleExport}
            className="flex h-11 items-center gap-2 rounded-lg border border-gd-mist/60 bg-white px-3 text-sm font-medium text-slate-600 hover:bg-gd-ice"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mb-4 animate-fade-in rounded-xl border border-gd-mist/50 bg-white p-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <FilterSelect label="Famille" value={filters.famille} onChange={(v) => setFilters({ ...filters, famille: v })} options={FAMILLES} />
              <FilterSelect label="Segment" value={filters.segment} onChange={(v) => setFilters({ ...filters, segment: v })} options={SEGMENTS} />
              <FilterSelect label="Département" value={filters.departement} onChange={(v) => setFilters({ ...filters, departement: v })} options={DEPARTEMENTS.map((d) => `${d.code} ${d.nom}`)} rawOptions={DEPARTEMENTS.map((d) => d.code)} />
              <FilterSelect label="Statut" value={filters.statut} onChange={(v) => setFilters({ ...filters, statut: v })} options={STATUTS_COMPTE} />
              <FilterSelect label="Potentiel" value={filters.potentiel} onChange={(v) => setFilters({ ...filters, potentiel: v })} options={POTENTIELS} />
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={filters.sansTel} onChange={(e) => setFilters({ ...filters, sansTel: e.target.checked })} className="h-4 w-4 rounded accent-gd-blue" />
                Sans téléphone
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={filters.jamaisContacte} onChange={(e) => setFilters({ ...filters, jamaisContacte: e.target.checked })} className="h-4 w-4 rounded accent-gd-blue" />
                Jamais contacté
              </label>
              {activeFilterCount > 0 && (
                <button onClick={() => setFilters({ famille: "", segment: "", departement: "", statut: "", potentiel: "", sansTel: false, jamaisContacte: false })} className="flex items-center gap-1 text-sm font-medium text-gd-danger">
                  <X className="h-3.5 w-3.5" /> Réinitialiser
                </button>
              )}
            </div>
          </div>
        )}

        {/* List */}
        {loading && comptes.length === 0 ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gd-mist border-t-gd-blue" />
          </div>
        ) : comptes.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {comptes.map((c) => (
              <CompteCard key={c.id} compte={c} onClick={() => navigate(`/comptes/${c.id}`)} />
            ))}
          </div>
        )}

        {hasMore && !loading && (
          <div className="mt-6 flex justify-center">
            <button onClick={() => loadComptes(cursor)} className="rounded-lg border border-gd-mist/60 bg-white px-5 py-2.5 text-sm font-medium text-gd-blue hover:bg-gd-ice">
              Charger plus
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, rawOptions }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full appearance-none rounded-lg border border-gd-mist/60 bg-white px-3 pr-8 text-sm outline-none focus:border-gd-blue"
        >
          <option value="">Tous</option>
          {options.map((o, i) => (
            <option key={o} value={rawOptions ? rawOptions[i] : o}>{o}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}

function CompteCard({ compte, onClick }) {
  return (
    <button onClick={onClick} className="group flex flex-col rounded-xl border border-gd-mist/50 bg-white p-4 text-left shadow-sm transition hover:border-gd-blue/30 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0 text-gd-blue" />
            <h3 className="truncate text-sm font-semibold">{compte.raison_sociale}</h3>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{compte.ville || "—"} {compte.departement ? `(${compte.departement})` : ""}</span>
          </div>
        </div>
        <ScoreBadge score={compte.score} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <StatutBadge statut={compte.statut || "À qualifier"} />
        {compte.segment && <SegmentBadge segment={compte.segment} />}
        <PotentielBadge potentiel={compte.potentiel} />
      </div>
      {compte.telephone_1 && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Phone className="h-3 w-3" />
          {compte.telephone_1}
        </div>
      )}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Building2 className="h-12 w-12 text-gd-mist" />
      <p className="mt-4 text-sm font-medium text-muted-foreground">Aucun compte trouvé</p>
      <p className="mt-1 text-xs text-muted-foreground">Importez votre fichier ou modifiez les filtres</p>
    </div>
  );
}