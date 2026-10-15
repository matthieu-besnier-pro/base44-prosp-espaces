import { NavLink, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import {
  CalendarCheck,
  CalendarDays,
  Building2,
  Map,
  Route,
  LayoutDashboard,
  Settings,
  Plus,
  Search,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import SaisieExpress from "@/components/SaisieExpress";

const NAV_MOBILE = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/ma-journee", label: "Ma journée", icon: CalendarCheck },
  { to: "/calendrier", label: "Calendrier", icon: CalendarDays },
  { to: "/comptes", label: "Clients", icon: Building2 },
  { to: "/carte", label: "Carte", icon: Map },
];

const NAV_DESKTOP_EXTRA = [
  { to: "/organiser-journee", label: "Organiser une journée", icon: Route },
  { to: "/parametres", label: "Paramètres", icon: Settings },
];

function BrandMark({ variant = "light" }) {
  const color = variant === "light" ? "text-white" : "text-gd-blue";
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gd-yellow font-heading text-lg font-extrabold text-gd-blue">
        GD
      </div>
      <div className={`font-heading text-sm font-bold leading-tight ${color}`}>
        GONNIN-DURIS
        <div className="text-[10px] font-medium opacity-70">Prospection</div>
      </div>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [plusOpen, setPlusOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gd-ice">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-gd-blue lg:flex">
        <div className="flex h-16 items-center border-b border-white/10 px-5">
          <BrandMark variant="light" />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_MOBILE.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
          <div className="my-3 border-t border-white/10" />
          {NAV_DESKTOP_EXTRA.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2 text-white/80">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">
              {(user?.full_name || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-white">
                {user?.full_name || user?.email || "Utilisateur"}
              </div>
              <div className="truncate text-[10px] text-white/60">{user?.role || ""}</div>
            </div>
            <button
              onClick={() => logout()}
              className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-gd-mist/60 bg-white/80 px-4 backdrop-blur-md lg:px-8">
          <div className="lg:hidden">
            <BrandMark variant="dark" />
          </div>
          <div className="relative ml-auto w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un client, une ville, un SIREN…"
              className="h-10 w-full rounded-lg border border-gd-mist/60 bg-gd-ice pl-9 pr-3 text-sm outline-none focus:border-gd-blue focus:ring-2 focus:ring-gd-blue/10"
            />
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] pb-24 lg:pb-8"><Outlet /></main>
      </div>

      {/* Floating + button */}
      <button
        onClick={() => setPlusOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gd-yellow text-gd-black shadow-lg shadow-gd-yellow/30 transition active:scale-95 lg:bottom-8 lg:right-8"
        aria-label="Saisie express"
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </button>

      <SaisieExpress open={plusOpen} onClose={() => setPlusOpen(false)} />

      {/* Bottom tab bar mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-stretch border-t border-gd-mist/60 bg-white/95 backdrop-blur-md lg:hidden">
        {NAV_MOBILE.map((item) => {
          const active = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                active ? "text-gd-blue" : "text-slate-400"
              }`}
            >
              <item.icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </NavLink>
          );
        })}
        <button
          onClick={() => setPlusOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-slate-400"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gd-yellow text-gd-black">
            <Plus className="h-4 w-4" strokeWidth={3} />
          </div>
          Plus
        </button>
      </nav>


    </div>
  );
}

function NavItem({ to, label, icon: Icon, adminOnly }) {
  const { user } = useAuth();
  if (adminOnly && user?.role !== "Admin") return null;
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
          isActive
            ? "bg-gd-yellow text-gd-blue"
            : "text-white/70 hover:bg-white/10 hover:text-white"
        }`
      }
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
      {label}
    </NavLink>
  );
}