import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ROLES } from "@/lib/crm-constants";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { UserCheck, UserX, Clock, Shield, Mail, UserPlus } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Utilisateurs() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await base44.entities.User.list({ sort: "-created_date" });
      setUsers(res.items || res);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const emailValid = EMAIL_RE.test(inviteEmail.trim());
  const alreadyInvited = users.some((u) => u.email?.toLowerCase() === inviteEmail.trim().toLowerCase());

  const invite = async () => {
    if (!emailValid || alreadyInvited) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
      toast({
        title: "Invitation envoyée",
        description: `${inviteEmail.trim()} va recevoir un email pour rejoindre l'outil.`,
      });
      setInviteEmail("");
      await load();
    } catch (e) {
      console.error(e);
      toast({ title: "Échec de l'invitation", description: e.message || "Réessayez dans un instant.", variant: "destructive" });
    }
    setInviting(false);
  };

  const updateUser = async (u, data) => {
    try {
      await base44.entities.User.update(u.id, data);
      await load();
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "La mise à jour de l'utilisateur a échoué.", variant: "destructive" });
    }
  };

  if (currentUser?.role !== "Admin") {
    return (
      <div className="rounded-xl border border-dashed border-gd-mist/60 bg-white p-8 text-center text-sm text-muted-foreground">
        <Shield className="mx-auto h-8 w-8 text-gd-mist" />
        <p className="mt-3">Réservé aux administrateurs</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
        {/* Ajout / invitation */}
        <div className="rounded-xl border border-gd-mist/40 bg-white p-4">
          <h3 className="gd-title mb-3 flex items-center gap-1.5 text-sm text-gd-blue">
            <UserPlus className="h-4 w-4" /> Ajouter un utilisateur
          </h3>
          <div className="flex flex-wrap gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && emailValid && !alreadyInvited) invite(); }}
              placeholder="email@exemple.fr"
              className={`h-10 flex-1 rounded-lg border px-3 text-sm outline-none focus:border-gd-blue ${
                inviteEmail && !emailValid ? "border-gd-danger" : "border-gd-mist/60"
              }`}
            />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="h-10 rounded-lg border border-gd-mist/60 px-3 text-sm outline-none focus:border-gd-blue">
              <option value="user">Lecteur</option>
              <option value="admin">Admin</option>
            </select>
            <button onClick={invite} disabled={inviting || !emailValid || alreadyInvited} className="flex items-center gap-1.5 rounded-lg bg-gd-blue px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              <Mail className="h-4 w-4" /> {inviting ? "Envoi…" : "Inviter"}
            </button>
          </div>
          {inviteEmail && !emailValid && (
            <p className="mt-2 text-xs font-medium text-gd-danger">Adresse email invalide.</p>
          )}
          {alreadyInvited && (
            <p className="mt-2 text-xs font-medium text-gd-danger">Cet utilisateur est déjà dans la liste ci-dessous.</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">L'ajout se fait par invitation email. Une fois connecté, l'utilisateur est « En attente » jusqu'à validation.</p>
        </div>

        {/* Users list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gd-mist border-t-gd-blue" />
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-xl border border-gd-mist/40 bg-white p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gd-ice text-sm font-bold text-gd-blue">
                  {(u.full_name || u.email || "U").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{u.full_name || u.email}</div>
                  <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                </div>
                <StatutUser statut={u.statut || "En attente"} />
                <select
                  value={u.role || "user"}
                  onChange={(e) => updateUser(u, { role: e.target.value })}
                  className="h-9 rounded-lg border border-gd-mist/60 px-2 text-xs outline-none focus:border-gd-blue"
                >
                  {ROLES.map((r) => <option key={r} value={r === "Admin" ? "admin" : "user"}>{r}</option>)}
                </select>
                {u.statut !== "Validé" && (
                  <button onClick={() => updateUser(u, { statut: "Validé", date_validation: new Date().toISOString().split("T")[0] })} className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200">
                    <UserCheck className="h-3.5 w-3.5" /> Valider
                  </button>
                )}
                {u.statut === "Validé" && (
                  <button onClick={() => updateUser(u, { statut: "Désactivé" })} className="flex items-center gap-1 rounded-lg bg-rose-100 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200">
                    <UserX className="h-3.5 w-3.5" /> Désactiver
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

function StatutUser({ statut }) {
  const config = {
    "En attente": { icon: Clock, cls: "bg-amber-100 text-amber-700" },
    "Validé": { icon: UserCheck, cls: "bg-emerald-100 text-emerald-700" },
    "Désactivé": { icon: UserX, cls: "bg-rose-100 text-rose-700" },
  };
  const c = config[statut] || config["En attente"];
  const Icon = c.icon;
  return (
    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.cls}`}>
      <Icon className="h-3 w-3" /> {statut}
    </span>
  );
}