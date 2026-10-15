import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PageTitle from "@/components/PageTitle";
import { STATUT_COULEUR, STATUTS_COMPTE } from "@/lib/crm-constants";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { MapPin, Eye, EyeOff } from "lucide-react";

const DOT_HEX = {
  slate: "94a3b8", blue: "3b82f6", cyan: "06b6d4", violet: "8b5cf6",
  amber: "f59e0b", emerald: "10b981", rose: "f43f5e", zinc: "a1a1aa",
};

function dotColorHex(statut) {
  const key = (STATUT_COULEUR[statut] || STATUT_COULEUR["À qualifier"]).dot
    .replace("bg-", "").replace(/-\d+$/, "");
  return `#${DOT_HEX[key] || DOT_HEX.slate}`;
}

export default function Carte() {
  const navigate = useNavigate();
  const [comptes, setComptes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hiddenStatuts, setHiddenStatuts] = useState(() => new Set());

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.entities.Compte.filter(
          { latitude: { $exists: true } },
          { limit: 500, fields: ["raison_sociale", "ville", "departement", "statut", "latitude", "longitude", "telephone_1", "segment", "potentiel"] }
        );
        setComptes(res.items || res);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
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

  return (
    <div className="animate-fade-in">
      <PageTitle subtitle={`${geolocalises.length} clients géolocalisés`}>Carte & tournée</PageTitle>
      <div className="p-4 lg:p-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gd-mist border-t-gd-blue" />
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
