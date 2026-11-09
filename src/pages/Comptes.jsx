import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageTitle from "@/components/PageTitle";
import { StatutBadge, PotentielBadge, ScoreBadge } from "@/components/badges";
import {
  FAMILLES, SEGMENTS, DEPARTEMENTS, POTENTIELS, STATUTS_COMPTE, pipelineAvancement, TEMPERATURE_COULEUR,
} from "@/lib/crm-constants";
import { exportCsv, deptLabel, rechercherTelephoneIA, statutApresNumeroTrouve } from "@/lib/crm-helpers";
import { toast } from "@/components/ui/use-toast";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  Search, SlidersHorizontal, Download, MapPin, Phone, Building2, X, ChevronDown, ChevronRight, Sparkles, FileText, AlertTriangle,
} from "lucide-react";

const PAGE_SIZE = 50;

// Classement des températures pour le tri "par rapport" (le plus chaud/récent en premier)
const RANG_TEMPERATURE = { Chaud: 3, Tiède: 2, Froid: 1, "": 0 };

export default function Comptes() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [comptes, setComptes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [rechercheTel, setRechercheTel] = useState({ actif: false, fait: 0, total: 0, succes: 0 });
  const [rapportsParCompte, setRapportsParCompte] = useState({});
  const abortTelRef = useRef(false);
  const requestIdRef = useRef(0);

  // Les filtres/recherche/tri sont initialisés depuis l'URL et resynchronisés vers elle
  // ci-dessous : ça permet de revenir sur la liste (ex. retour depuis une fiche client)
  // en retrouvant exactement le même filtrage, au lieu de repartir de zéro à chaque fois.
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [filters, setFilters] = useState(() => ({
    famille: searchParams.get("famille") || "",
    segment: searchParams.get("segment") || "",
    departement: searchParams.get("departement") || "",
    statut: searchParams.get("statut") || "",
    potentiel: searchParams.get("potentiel") || "",
    sansTel: searchParams.get("sansTel") === "1",
    jamaisContacte: searchParams.get("jamaisContacte") === "1",
    contacteSansDate: searchParams.get("contacteSansDate") === "1",
  }));
  const [sortMode, setSortMode] = useState(() => searchParams.get("tri") || "score");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const params = {};
    if (search) params.q = search;
    if (filters.famille) params.famille = filters.famille;
    if (filters.segment) params.segment = filters.segment;
    if (filters.departement) params.departement = filters.departement;
    if (filters.statut) params.statut = filters.statut;
    if (filters.potentiel) params.potentiel = filters.potentiel;
    if (filters.sansTel) params.sansTel = "1";
    if (filters.jamaisContacte) params.jamaisContacte = "1";
    if (filters.contacteSansDate) params.contacteSansDate = "1";
    if (sortMode !== "score") params.tri = sortMode;
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filters, sortMode]);

  const buildQuery = useMemo(() => {
    return () => {
      const q = {};
      if (filters.famille) q.famille = filters.famille;
      if (filters.segment) q.segment = filters.segment;
      if (filters.departement) q.departement = filters.departement;
      if (filters.potentiel) q.potentiel = filters.potentiel;
      if (filters.sansTel) q.telephone_1 = { $exists: false };
      // "Contactés sans date" cible spécifiquement le statut Contacté sans date de
      // dernier contact : prioritaire sur le filtre Statut et sur "Jamais contacté".
      if (filters.contacteSansDate) {
        q.statut = "Contacté";
        q.date_dernier_contact = { $exists: false };
      } else {
        if (filters.statut) q.statut = filters.statut;
        if (filters.jamaisContacte) q.date_dernier_contact = { $exists: false };
      }
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

  // Récupère, pour un lot de comptes, s'ils ont au moins un rapport de contact et le plus
  // récent (température, date) — utilisé pour le TAG "Rapport" et le tri par rapport.
  const chargerRapports = async (ids) => {
    if (ids.length === 0) return;
    try {
      const res = await base44.entities.RapportContact.filter(
        { $or: ids.map((id) => ({ compte_id: id })) },
        { sort: "-date_heure", limit: 500, fields: ["compte_id", "temperature", "date_heure"] }
      );
      const items = res.items || res;
      setRapportsParCompte((prev) => {
        const next = { ...prev };
        for (const r of items) {
          if (!next[r.compte_id]) {
            next[r.compte_id] = { count: 1, derniereTemperature: r.temperature || "", derniereDate: r.date_heure };
          } else {
            next[r.compte_id] = { ...next[r.compte_id], count: next[r.compte_id].count + 1 };
          }
        }
        return next;
      });
    } catch (e) {
      console.error("[rapports] échec du chargement groupé", e);
    }
  };

  const loadComptes = async (resetCursor = null) => {
    const myRequestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const q = buildQuery();
      const [page, count] = await Promise.all([
        base44.entities.Compte.filter(q, {
          sort: "-score",
          limit: PAGE_SIZE,
          cursor: resetCursor,
          fields: ["raison_sociale", "ville", "code_postal", "departement", "segment", "famille", "statut", "potentiel", "score", "telephone_1", "date_dernier_contact", "resume_ia"],
        }),
        base44.entities.Compte.count(q),
      ]);
      // Une requête plus récente a déjà été lancée entre-temps (filtre changé pendant
      // le chargement) : on jette cette réponse pour éviter qu'elle n'écrase le résultat
      // à jour avec des données périmées (l'ancien filtre resterait sinon affiché).
      if (myRequestId !== requestIdRef.current) return;
      setComptes((prev) => (resetCursor ? [...prev, ...page.items] : page.items));
      setCursor(page.next_cursor);
      setHasMore(page.has_more);
      setTotal(count);
      chargerRapports(page.items.map((c) => c.id));
    } catch (e) {
      console.error(e);
    }
    if (myRequestId === requestIdRef.current) setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(() => loadComptes(null), search ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, search]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // Tri par rapport : ne s'applique qu'à la page actuellement chargée (pas de champ
  // dénormalisé côté Compte pour trier ça côté serveur) — même logique de tri "best
  // effort" que l'optimisation de trajet de Ma Journée, assumée et documentée ici.
  const comptesAffiches = useMemo(() => {
    if (sortMode !== "rapport") return comptes;
    return [...comptes].sort((a, b) => {
      const ra = rapportsParCompte[a.id];
      const rb = rapportsParCompte[b.id];
      if (!ra && !rb) return 0;
      if (!ra) return 1;
      if (!rb) return -1;
      const rangA = RANG_TEMPERATURE[ra.derniereTemperature || ""] ?? 0;
      const rangB = RANG_TEMPERATURE[rb.derniereTemperature || ""] ?? 0;
      if (rangA !== rangB) return rangB - rangA;
      return new Date(rb.derniereDate || 0) - new Date(ra.derniereDate || 0);
    });
  }, [comptes, sortMode, rapportsParCompte]);

  const handlePhoneFound = (id, telephone, statut) => {
    setComptes((prev) => prev.map((c) => (c.id === id ? { ...c, telephone_1: telephone, ...(statut ? { statut } : {}) } : c)));
  };

  const handleDateContactSaved = (id, date) => {
    setComptes((prev) => prev.map((c) => (c.id === id ? { ...c, date_dernier_contact: date } : c)));
  };

  // Requête de base (famille/segment/département/statut/potentiel/recherche), sans la
  // clause $exists sur telephone_1 : on filtre "sans téléphone" côté client à la place
  // (un $exists sur un champ non-string s'est avéré peu fiable sur cette base — par
  // prudence on évite de s'y fier aussi ici pour la recherche IA en masse).
  const buildQuerySansExists = () => {
    const q = {};
    if (filters.famille) q.famille = filters.famille;
    if (filters.segment) q.segment = filters.segment;
    if (filters.departement) q.departement = filters.departement;
    if (filters.statut) q.statut = filters.statut;
    if (filters.potentiel) q.potentiel = filters.potentiel;
    if (search.trim().length >= 2) {
      q.$or = [
        { raison_sociale: { $regex: search.trim(), $options: "i" } },
        { ville: { $regex: search.trim(), $options: "i" } },
        { siren: { $regex: search.trim(), $options: "i" } },
      ];
    }
    return q;
  };

  const lancerRechercheTelephones = async () => {
    abortTelRef.current = false;
    setRechercheTel({ actif: true, fait: 0, total: 0, succes: 0 });
    try {
      let cursor;
      let tous = [];
      const q = buildQuerySansExists();
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const page = await base44.entities.Compte.filter(q, {
          limit: 200,
          cursor,
          fields: ["raison_sociale", "adresse", "code_postal", "ville", "departement", "segment", "telephone_1", "statut"],
        });
        const items = page.items || page;
        tous = tous.concat(items);
        if (!page.has_more || !page.next_cursor) break;
        cursor = page.next_cursor;
      }

      const aTraiter = tous.filter((c) => !c.telephone_1);
      setRechercheTel((g) => ({ ...g, total: aTraiter.length }));
      if (aTraiter.length === 0) {
        toast({ title: "Rien à chercher", description: "Tous les clients filtrés ont déjà un téléphone." });
        setRechercheTel({ actif: false, fait: 0, total: 0, succes: 0 });
        return;
      }

      const LOT = 3;
      let fait = 0;
      let succes = 0;
      for (let i = 0; i < aTraiter.length; i += LOT) {
        if (abortTelRef.current) break;
        const lot = aTraiter.slice(i, i + LOT);
        await Promise.all(lot.map(async (c) => {
          const { telephone } = await rechercherTelephoneIA(c);
          if (telephone) {
            try {
              const statut = statutApresNumeroTrouve(c.statut, c.statut);
              await base44.entities.Compte.update(c.id, { telephone_1: telephone, statut });
              succes++;
              handlePhoneFound(c.id, telephone, statut);
            } catch (e) { console.error("[recherche téléphone IA] échec de l'enregistrement", c.raison_sociale, e); }
          }
          fait++;
        }));
        setRechercheTel({ actif: true, fait, total: aTraiter.length, succes });
      }

      toast({
        title: abortTelRef.current ? "Recherche interrompue" : "Recherche terminée",
        description: `${succes}/${fait} numéro${fait > 1 ? "s" : ""} trouvé${succes > 1 ? "s" : ""}.`,
      });
    } catch (e) {
      console.error("[recherche téléphone IA] erreur générale", e);
      toast({ title: "Erreur", description: e.message || "La recherche a échoué.", variant: "destructive" });
    }
    setRechercheTel((g) => ({ ...g, actif: false }));
  };

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
    ], "clients.csv");
  };

  return (
    <div className="animate-fade-in">
      <PageTitle subtitle={`${total} client${total > 1 ? "s" : ""}`}>
        Clients
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
          <div className="relative hidden sm:block">
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value)}
              className="h-11 w-full appearance-none rounded-lg border border-gd-mist/60 bg-white pl-3 pr-8 text-sm text-slate-600 outline-none focus:border-gd-blue"
              title="Trier la liste"
            >
              <option value="score">Trier par score</option>
              <option value="rapport">Trier par rapport (chaud en 1er)</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
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
              <label className="flex items-center gap-2 text-sm text-slate-600" title="Statut Contacté mais aucune date de dernier contact enregistrée (remplace le filtre Statut)">
                <input type="checkbox" checked={filters.contacteSansDate} onChange={(e) => setFilters({ ...filters, contacteSansDate: e.target.checked })} className="h-4 w-4 rounded accent-gd-blue" />
                Contactés sans date
              </label>
              {activeFilterCount > 0 && (
                <button onClick={() => setFilters({ famille: "", segment: "", departement: "", statut: "", potentiel: "", sansTel: false, jamaisContacte: false, contacteSansDate: false })} className="flex items-center gap-1 text-sm font-medium text-gd-danger">
                  <X className="h-3.5 w-3.5" /> Réinitialiser
                </button>
              )}
            </div>

            <div className="mt-3 border-t border-gd-mist/30 pt-3">
              {rechercheTel.actif ? (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-gd-blue">
                      <Sparkles className="h-3.5 w-3.5" /> Recherche IA en cours…
                    </span>
                    <button onClick={() => { abortTelRef.current = true; }} className="text-slate-400 hover:text-gd-danger" title="Arrêter">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gd-ice">
                    <div
                      className="h-full rounded-full bg-gd-blue transition-all"
                      style={{ width: `${rechercheTel.total > 0 ? Math.round((rechercheTel.fait / rechercheTel.total) * 100) : 0}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {rechercheTel.fait}/{rechercheTel.total} traités · {rechercheTel.succes} trouvés
                  </p>
                </div>
              ) : (
                <button
                  onClick={lancerRechercheTelephones}
                  className="flex items-center gap-1.5 text-xs font-medium text-gd-blue hover:underline"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Rechercher avec l'IA tous les numéros manquants (selon les filtres ci-dessus)
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
          <div className="overflow-hidden rounded-xl border border-gd-mist/50 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-gd-mist/40 hover:bg-transparent">
                  <TableHead className="min-w-[220px]">Client</TableHead>
                  <TableHead className="hidden lg:table-cell">Segment</TableHead>
                  <TableHead className="min-w-[160px]">Avancement</TableHead>
                  <TableHead className="hidden sm:table-cell">Potentiel</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="hidden md:table-cell">Dernier contact</TableHead>
                  <TableHead className="hidden sm:table-cell">Téléphone</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {comptesAffiches.map((c) => (
                  <CompteRow key={c.id} compte={c} rapportInfo={rapportsParCompte[c.id]} onClick={() => navigate(`/comptes/${c.id}`)} onPhoneFound={handlePhoneFound} onDateContactSaved={handleDateContactSaved} />
                ))}
              </TableBody>
            </Table>
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

function CompteRow({ compte, rapportInfo, onClick, onPhoneFound, onDateContactSaved }) {
  const av = pipelineAvancement(compte.statut || "À qualifier");
  const barColor = av.special === "Perdu" ? "bg-gd-danger" : av.special ? "bg-zinc-300" : "bg-gd-blue";

  return (
    <TableRow onClick={onClick} className="cursor-pointer border-gd-mist/30 hover:bg-gd-ice">
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gd-ice text-gd-blue">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold">{compte.raison_sociale}</span>
              {compte.resume_ia && (
                <Sparkles className="h-3 w-3 shrink-0 text-gd-yellow" aria-label="Analyse IA disponible" />
              )}
              {rapportInfo && (
                <span
                  className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${TEMPERATURE_COULEUR[rapportInfo.derniereTemperature] || "bg-slate-100 text-slate-600"}`}
                  title={`${rapportInfo.count} rapport${rapportInfo.count > 1 ? "s" : ""}${rapportInfo.derniereTemperature ? " · " + rapportInfo.derniereTemperature : ""}`}
                >
                  <FileText className="h-2.5 w-2.5" /> Rapport
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{compte.ville || "—"} {compte.departement ? `(${compte.departement})` : ""}</span>
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <span className="text-xs text-muted-foreground">{compte.segment || "—"}</span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gd-ice">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${av.pct}%` }} />
          </div>
          <StatutBadge statut={compte.statut || "À qualifier"} />
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <PotentielBadge potentiel={compte.potentiel} />
      </TableCell>
      <TableCell>
        <ScoreBadge score={compte.score} />
      </TableCell>
      <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground md:table-cell">
        {compte.date_dernier_contact ? (
          new Date(compte.date_dernier_contact).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
        ) : compte.statut === "Contacté" ? (
          <DateContactManquante compte={compte} onSaved={onDateContactSaved} />
        ) : (
          "Jamais"
        )}
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        {compte.telephone_1 ? (
          <span className="flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
            <Phone className="h-3 w-3" /> {compte.telephone_1}
          </span>
        ) : (
          <ChercherTelephoneButton compte={compte} onFound={onPhoneFound} />
        )}
      </TableCell>
      <TableCell>
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </TableCell>
    </TableRow>
  );
}

// Un client "Contacté" sans date de dernier contact est une anomalie de données
// (souvent un compte passé à ce statut avant que la mise à jour automatique de la
// date n'existe) : ce contrôle permet de la corriger directement depuis la liste.
function DateContactManquante({ compte, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const enregistrer = async (e) => {
    e.stopPropagation();
    if (!date) return;
    setSaving(true);
    try {
      await base44.entities.Compte.update(compte.id, { date_dernier_contact: date });
      onSaved(compte.id, date);
      toast({ title: "Date de contact enregistrée", description: compte.raison_sociale });
      setEditing(false);
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "L'enregistrement a échoué.", variant: "destructive" });
    }
    setSaving(false);
  };

  if (!editing) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        className="flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-200"
        title="Statut « Contacté » sans date de dernier contact — cliquez pour la renseigner"
      >
        <AlertTriangle className="h-2.5 w-2.5" /> Sans date
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <input
        type="date"
        value={date}
        max={new Date().toISOString().split("T")[0]}
        onChange={(e) => setDate(e.target.value)}
        className="h-7 w-[108px] rounded border border-gd-mist/60 px-1 text-[11px] outline-none focus:border-gd-blue"
      />
      <button onClick={enregistrer} disabled={saving} className="rounded bg-gd-blue px-1.5 py-1 text-[10px] font-semibold text-white disabled:opacity-50">
        {saving ? "…" : "OK"}
      </button>
    </div>
  );
}

function ChercherTelephoneButton({ compte, onFound }) {
  const [loading, setLoading] = useState(false);

  const chercher = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const { telephone, source } = await rechercherTelephoneIA(compte);
      if (telephone) {
        const statut = statutApresNumeroTrouve(compte.statut, compte.statut);
        await base44.entities.Compte.update(compte.id, { telephone_1: telephone, statut });
        onFound(compte.id, telephone, statut);
        toast({
          title: "Numéro trouvé et enregistré",
          description: `${compte.raison_sociale} : ${telephone}${source ? " · " + source : ""}`,
        });
      } else {
        toast({ title: "Aucun numéro trouvé", description: `L'IA n'a rien trouvé de fiable pour ${compte.raison_sociale}.` });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur", description: "La recherche IA a échoué.", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <button
      onClick={chercher}
      disabled={loading}
      className="flex items-center gap-1 whitespace-nowrap text-xs font-medium text-gd-blue hover:underline disabled:opacity-50"
      title="Rechercher ce numéro avec l'IA"
    >
      <Sparkles className="h-3 w-3" /> {loading ? "Recherche…" : "Trouver avec l'IA"}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Building2 className="h-12 w-12 text-gd-mist" />
      <p className="mt-4 text-sm font-medium text-muted-foreground">Aucun client trouvé</p>
      <p className="mt-1 text-xs text-muted-foreground">Importez votre fichier ou modifiez les filtres</p>
    </div>
  );
}