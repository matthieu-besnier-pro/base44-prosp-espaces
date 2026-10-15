import PageTitle from "@/components/PageTitle";
import { Database, Bell, Palette, Info, Upload, Users } from "lucide-react";
import ImportSection from "@/pages/Import";
import UtilisateursSection from "@/pages/Utilisateurs";

export default function Parametres() {
  return (
    <div className="animate-fade-in">
      <PageTitle subtitle="Configuration de l'application">Paramètres</PageTitle>
      <div className="space-y-6 p-4 lg:max-w-3xl lg:p-8">
        <section>
          <h2 className="gd-title mb-3 text-sm text-gd-blue">Général</h2>
          <div className="space-y-3">
            <SettingCard icon={Database} title="Données" desc="1 685 prospects importés (697 espaces verts, 988 collectivités)" />
            <SettingCard icon={Bell} title="Relances automatiques" desc="Devis sans réponse à J+7, prospect A sans contact 60 jours, équipement à renouveler 6 mois" />
            <SettingCard icon={Palette} title="Charte Gonnin-Duris" desc="Bleu #01377D, jaune #FEB800, police Poppins" />
            <SettingCard icon={Info} title="À propos" desc="CRM Prospection Gonnin-Duris — Concessionnaire New Holland — Zone 16, 79, 86" />
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2 text-gd-blue">
            <Upload className="h-4 w-4" strokeWidth={2.2} />
            <h2 className="gd-title text-sm">Import de prospects</h2>
          </div>
          <ImportSection />
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2 text-gd-blue">
            <Users className="h-4 w-4" strokeWidth={2.2} />
            <h2 className="gd-title text-sm">Utilisateurs</h2>
          </div>
          <UtilisateursSection />
        </section>
      </div>
    </div>
  );
}

function SettingCard({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gd-mist/40 bg-white p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gd-ice text-gd-blue">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
