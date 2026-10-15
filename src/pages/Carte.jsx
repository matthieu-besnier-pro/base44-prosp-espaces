import { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import PageTitle from "@/components/PageTitle";
import { STATUT_COULEUR, STATUTS_COMPTE } from "@/lib/crm-constants";
import { geocoderAdresse } from "@/lib/crm-helpers";
import { toast } from "@/components/ui/use-toast";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { MapPin, Eye, EyeOff, Navigation, X } from "lucide-react";

const DOT_HEX = {
  slate: "94a3b8", blue: "3b82f6", cyan: "06b6d4", violet: "8b5cf6",
  amber: "f59e0b", emerald: "10b981", rose: "f43f5e", zinc: "a1a1aa",
};

function dotColorHex(statut) {
  const key = (STATUT_COULEUR[statut] || STATUT_COULEUR["À qualifier"]).dot
    .replace("bg-", "").replace(/-\d+$/, "");
  return `#${DOT_HEX[key] || DOT_HEX.slate}`;
}

// Le filtre `{ latitude: { $exists: ... } }` s'est avéré ne retourner aucun
// résultat dans un sens comme dans l'autre sur ce champ numérique (constaté en
// conditions réelles : "0 géolocalisés" ET "rien à géolocaliser" en même temps).
// Par sécurité, on récupère donc tous les comptes et on filtre côté client
// plutôt que de faire confiance à cet opérateur pour latitude/longitude.
async function recupererTousLesComptes(fields) {
  let cursor;
  let tous = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const page = await base44.entities.Compte.filter({}, { limit: 200, cursor, fields });
    const items = page.items || page;
    tous = tous.concat(items);
    if (!page.has_more || !page.next_cursor) break;
    cursor = page.next_cursor;
  }
  return tous;
}

export default function Carte() {
  const navigate = useNavigate();
  const [comptes, setComptes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hiddenStatuts, setHiddenStatuts] = useState(() => new Set());
  const [geocodage, setGeocodage] = useState({ actif: false, fait: 0, total: 0, succes: 0 });
  const abortRef = useRef(false);

  const chargerComptes = async () => {
    setLoading(true);
    try {
      const tous = await recupererTousLesComptes(
        ["raison_sociale", "ville", "departement", "statut", "latitude", "longitude", "telephone_1", "segment", "potentiel"]
      );
      setComptes(tous.filter((c) => c.latitude && c.longitude));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    chargerComptes();
  }, []);

  const geolocalises = useMemo(() => comptes.filter((c) => c.latitude && c.longitude), [comptes]);
  const visibles = useMemo(
    () => geolocalises.filter((c) => !hiddenStatuts.has(c.statut || "À qualifier")),
    [geolocalises, hiddenStatuts]
  );

  const toggleStatut = (s) => {
    setHiddenStatuts((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const center = useMemo(() => {
    if (visibles.length === 0) return [46.0, 0.3]; // Centre Poitou-Charentes
    const lats = visibles.map((c) => c.latitude);
    const lngs = visibles.map((c) => c.longitude);
    return [lats.reduce((a, b) => a + b, 0) / lats.length, lngs.reduce((a, b) => a + b, 0) / lngs.length];
  }, [visibles]);

  const lancerGeocodage = async () => {
    abortRef.current = false;
    setGeocodage({ actif: true, fait: 0, total: 0, succes: 0 });
    try {
      const tous = await recupererTousLesComptes(
        ["raison_sociale", "ville", "departement", "statut", "adresse", "code_postal", "telephone_1", "segment", "potentiel", "latitude", "longitude"]
      );
      const aTraiter = tous.filter((c) => !c.latitude || !c.longitude);

      setGeocodage((g) => ({ ...g, total: aTraiter.length }));
      if (aTraiter.length === 0) {
        toast({ title: "Rien à géolocaliser", description: "Tous les clients ont déjà des coordonnées." });
        setGeocodage({ actif: false, fait: 0, total: 0, succes: 0 });
        return;
      }

      const LOT = 5;
      let fait = 0;
      let succes = 0;
      for (let i = 0; i < aTraiter.length; i += LOT) {
        if (abortRef.current) break;
        const lot = aTraiter.slice(i, i + LOT);
        const nouveauxPoints = [];
        await Promise.all(lot.map(async (c) => {
          const coords = await geocoderAdresse(c);
          if (coords) {
            try {
              await base44.entities.Compte.update(c.id, coords);
              succes++;
              nouveauxPoints.push({ ...c, ...coords });
            } catch (e) { console.error("[geolocalisation] échec de l'enregistrement", c.raison_sociale, e); }
          } else {
            console.warn("[geolocalisation] adresse introuvable pour", c.raison_sociale, c.adresse, c.code_postal, c.ville);
          }
          fait++;
        }));
        // Affiche les points sur la carte au fur et à mesure, sans attendre la fin du lot complet
        if (nouveauxPoints.length > 0) {
          setComptes((prev) => [...prev, ...nouveauxPoints]);
        }
        setGeocodage({ actif: true, fait, total: aTraiter.length, succes });
      }

      toast({
        title: abortRef.current ? "Géolocalisation interrompue" : "Géolocalisation terminée",
        description: `${succes}/${fait} client${fait > 1 ? "s" : ""} géolocalisé${succes > 1 ? "s" : ""}.`,
      });
      await chargerComptes();
    } catch (e) {
      console.error("[geolocalisation] erreur générale", e);
      toast({ title: "Erreur", description: e.message || "La géolocalisation a échoué.", variant: "destructive" });
    }
    setGeocodage((g) => ({ ...g, actif: false }));
  };

  return (
    <div className="animate-fade-in">
      <PageTitle subtitle={`${geolocalises.length} clients géolocalisés`}>Carte & tournée</PageTitle>
      <div className="p-4 lg:p-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gd-mist border-t-gd-blue" />
          </div>
        ) : geolocalises.length === 0 && !geocodage.actif ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-gd-mist/60 bg-white py-16 text-center">
            <MapPin className="h-10 w-10 text-gd-mist" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">Aucun client géolocalisé pour le moment</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              L'import ne calcule pas automatiquement les coordonnées GPS. Géolocalisez vos clients à partir de leur adresse pour les voir apparaître ici.
            </p>
            <button onClick={lancerGeocodage} className="mt-4 flex items-center gap-1.5 rounded-lg bg-gd-blue px-4 py-2.5 text-sm font-semibold text-white active:scale-95">
              <Navigation className="h-4 w-4" /> Géolocaliser mes clients
            </button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="h-[60vh] overflow-hidden rounded-xl border border-gd-mist/50 lg:h-[70vh]">
              <MapContainer center={center} zoom={8} className="h-full w-full">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                {visibles.map((c) => (
                  <CircleMarker key={c.id} center={[c.latitude, c.longitude]} radius={6} pathOptions={{ color: dotColorHex(c.statut), fillOpacity: 0.8 }}>
                    <Popup>
                      <div className="text-xs">
                        <button
                          onClick={() => navigate(`/comptes/${c.id}`)}
                          className="font-bold text-gd-blue hover:underline"
                        >
                          {c.raison_sociale}
                        </button>
                        <br />
                        {c.ville} ({c.departement})
                        <br />
                        Statut : {c.statut || "À qualifier"}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
            <div className="space-y-2 lg:max-h-[70vh] lg:overflow-y-auto">
              {geocodage.actif ? (
                <div className="rounded-xl border border-gd-mist/40 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="gd-title text-xs text-gd-blue">Géolocalisation en cours…</h3>
                    <button onClick={() => { abortRef.current = true; }} className="text-slate-400 hover:text-gd-danger" title="Arrêter">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gd-ice">
                    <div
                      className="h-full rounded-full bg-gd-blue transition-all"
                      style={{ width: `${geocodage.total > 0 ? Math.round((geocodage.fait / geocodage.total) * 100) : 0}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {geocodage.fait}/{geocodage.total} traités · {geocodage.succes} géolocalisés
                  </p>
                </div>
              ) : (
                <button onClick={lancerGeocodage} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gd-mist/60 bg-white px-3 py-2.5 text-xs font-medium text-gd-blue hover:bg-gd-ice">
                  <Navigation className="h-3.5 w-3.5" /> Géolocaliser les clients manquants
                </button>
              )}

              <div className="rounded-xl border border-gd-mist/40 bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="gd-title text-xs text-gd-blue">Calques (statuts)</h3>
                  {hiddenStatuts.size > 0 && (
                    <button onClick={() => setHiddenStatuts(new Set())} className="text-[10px] font-semibold text-gd-blue hover:underline">
                      Tout afficher
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {STATUTS_COMPTE.map((s) => {
                    const hidden = hiddenStatuts.has(s);
                    const c = STATUT_COULEUR[s] || STATUT_COULEUR["À qualifier"];
                    return (
                      <button
                        key={s}
                        onClick={() => toggleStatut(s)}
                        className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] transition ${
                          hidden ? "text-slate-300" : "text-foreground hover:bg-gd-ice"
                        }`}
                        title={hidden ? `Afficher ${s}` : `Masquer ${s}`}
                      >
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.dot} ${hidden ? "opacity-30" : ""}`} />
                        <span className="truncate">{s}</span>
                        {hidden ? <EyeOff className="ml-auto h-3 w-3 shrink-0" /> : <Eye className="ml-auto h-3 w-3 shrink-0 opacity-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="px-1 text-xs font-semibold text-muted-foreground">
                {visibles.length}/{geolocalises.length} clients affichés
              </div>

              {visibles.map((c) => (
                <button key={c.id} onClick={() => navigate(`/comptes/${c.id}`)} className="flex w-full items-center gap-2 rounded-lg border border-gd-mist/40 bg-white p-2.5 text-left hover:border-gd-blue/40 hover:bg-gd-ice">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${(STATUT_COULEUR[c.statut] || STATUT_COULEUR["À qualifier"]).dot}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-gd-blue">{c.raison_sociale}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{c.ville} ({c.departement})</div>
                  </div>
                </button>
              ))}
              {visibles.length === 0 && (
                <div className="flex flex-col items-center py-10 text-center text-muted-foreground">
                  <MapPin className="h-8 w-8 text-gd-mist" />
                  <p className="mt-2 text-xs">Aucun client visible avec ces calques</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
