import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Search, Building2 } from "lucide-react";

export default function HeaderSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await base44.entities.Compte.filter(
          {
            $or: [
              { raison_sociale: { $regex: q.trim(), $options: "i" } },
              { ville: { $regex: q.trim(), $options: "i" } },
              { siren: { $regex: q.trim(), $options: "i" } },
            ],
          },
          { limit: 6, fields: ["raison_sociale", "ville", "departement", "statut"] }
        );
        setResults(res.items || res);
      } catch (e) {
        console.error(e);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const goTo = (c) => {
    navigate(`/comptes/${c.id}`);
    setOpen(false);
    setQ("");
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Rechercher un client, une ville, un SIREN…"
        className="h-10 w-full rounded-lg border border-gd-mist/60 bg-gd-ice pl-9 pr-3 text-sm outline-none focus:border-gd-blue focus:ring-2 focus:ring-gd-blue/10"
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-72 overflow-y-auto rounded-lg border border-gd-mist/50 bg-white shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">Aucun résultat</p>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                onClick={() => goTo(c)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gd-ice"
              >
                <Building2 className="h-3.5 w-3.5 shrink-0 text-gd-blue" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.raison_sociale}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{c.ville}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
