import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Settings, LogOut, ChevronDown } from "lucide-react";

export default function HeaderUserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const initiale = (user?.full_name || user?.email || "U").charAt(0).toUpperCase();

  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu utilisateur"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-gd-ice"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gd-blue text-xs font-semibold text-white">
          {initiale}
        </div>
        <div className="hidden text-left sm:block">
          <div className="max-w-[120px] truncate text-xs font-semibold text-foreground">
            {user?.full_name || user?.email || "Utilisateur"}
          </div>
          <div className="truncate text-[10px] text-muted-foreground">{user?.role || ""}</div>
        </div>
        <ChevronDown className="hidden h-3.5 w-3.5 shrink-0 text-slate-400 sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1.5 w-52 rounded-lg border border-gd-mist/50 bg-white p-1 shadow-lg">
          <div className="border-b border-gd-mist/40 px-3 py-2 sm:hidden">
            <div className="truncate text-xs font-semibold">{user?.full_name || user?.email}</div>
            <div className="text-[10px] text-muted-foreground">{user?.role}</div>
          </div>
          <Link
            to="/parametres"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-gd-ice"
          >
            <Settings className="h-4 w-4" /> Paramètres
          </Link>
          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gd-danger hover:bg-rose-50"
          >
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}
