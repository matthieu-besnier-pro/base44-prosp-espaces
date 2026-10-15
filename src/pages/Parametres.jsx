import PageTitle from "@/components/PageTitle";
import { Settings, Database, Bell, Palette, Info } from "lucide-react";

export default function Parametres() {
  return (
    <div className="animate-fade-in">
      <PageTitle subtitle="Configuration de l'application">Paramètres</PageTitle>
      <div className="space-y-4 p-4 lg:max-w-3xl lg:p-8">
        <SettingCard icon={Database} title="Données" desc="1 685 prospects importés (697 espaces verts, 988 collectivités)" />
        <SettingCard icon={Bell} title="Relances automatiques" desc="Devis sans réponse à J+7, prospect A sans contact 60 jours, équipement à renouveler 6 mois" />
        <SettingCard icon={Palette} title="Charte Gonnin-Duris" desc="Bleu #01377D, jaune #FEB800, police Poppins" />
        <SettingCard icon={Info} title="À propos" desc="CRM Prospection Gonnin-Duris — Concessionnaire New Holland — Zone 16, 79, 86" />
      </div>
    </div>
  );
}

function SettingCard({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gd-mist/40 bg-white p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gd-ice text-gd-blue">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}