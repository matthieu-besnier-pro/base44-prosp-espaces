import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PageTitle from "@/components/PageTitle";
import { STATUT_COULEUR } from "@/lib/crm-constants";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";

export default function Carte() {
  const navigate = useNavigate();
  const [comptes, setComptes] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const center = useMemo(() => {
    if (comptes.length === 0) return [46.0, 0.3]; // Centre Poitou-Charentes
    const lats = comptes.map((c) => c.latitude).filter(Boolean);
    const lngs = comptes.map((c) => c.longitude).filter(Boolean);
    if (lats.length === 0) return [46.0, 0.3];
    return [lats.reduce((a, b) => a + b, 0) / lats.length, lngs.reduce((a, b) => a + b, 0) / lngs.length];
  }, [comptes]);

  return (
    <div className="animate-fade-in">
      <PageTitle subtitle={`${comptes.length} clients géolocalisés`}>Carte & tournée</PageTitle>
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
                {comptes.filter((c) => c.latitude && c.longitude).map((c) => {
                  const color = (STATUT_COULEUR[c.statut] || STATUT_COULEUR["À qualifier"]).dot.replace("bg-", "").replace("-500", "").replace("-400", "");
                  return (
                    <CircleMarker key={c.id} center={[c.latitude, c.longitude]} radius={6} pathOptions={{ color: `#${color === "slate" ? "94a3b8" : color === "blue" ? "3b82f6" : color === "cyan" ? "06b6d4" : color === "violet" ? "8b5cf6" : color === "amber" ? "f59e0b" : color === "emerald" ? "10b981" : color === "rose" ? "f43f5e" : "94a3b8"}`, fillOpacity: 0.8 }}>
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
                  );
                })}
              </MapContainer>
            </div>
            <div className="space-y-2 lg:max-h-[70vh] lg:overflow-y-auto">
              <div className="rounded-xl border border-gd-mist/40 bg-white p-3">
                <h3 className="gd-title mb-2 text-xs text-gd-blue">Légende</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(STATUT_COULEUR).map(([s, c]) => (
                    <div key={s} className="flex items-center gap-1.5 text-[11px]">
                      <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} /> {s}
                    </div>
                  ))}
                </div>
              </div>
              {comptes.filter((c) => c.latitude && c.longitude).slice(0, 50).map((c) => (
                <button key={c.id} onClick={() => navigate(`/comptes/${c.id}`)} className="flex w-full items-center gap-2 rounded-lg border border-gd-mist/40 bg-white p-2.5 text-left hover:border-gd-blue/40 hover:bg-gd-ice">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${(STATUT_COULEUR[c.statut] || STATUT_COULEUR["À qualifier"]).dot}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-gd-blue">{c.raison_sociale}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{c.ville} ({c.departement})</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}