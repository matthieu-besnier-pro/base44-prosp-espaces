import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { StatutBadge, PotentielBadge, ScoreBadge, SegmentBadge } from "@/components/badges";
import { calculerScore } from "@/lib/crm-helpers";
import { DEPARTEMENTS, STATUTS_COMPTE, POTENTIELS, SEGMENTS, CONCESSIONS, SOURCES, CONSENTEMENTS } from "@/lib/crm-constants";
import { Phone, Mail, MapPin, ChevronLeft, ExternalLink, Mic } from "lucide-react";
import ActiviteTab from "@/components/fiche/ActiviteTab";
import ContactsTab from "@/components/fiche/ContactsTab";
import OpportunitesTab from "@/components/fiche/OpportunitesTab";
import ParcTab from "@/components/fiche/ParcTab";
import InfosTab from "@/components/fiche/InfosTab";

const TABS = [
  { id: "activite", label: "Activité" },
  { id: "contacts", label: "Contacts" },
  { id: "opportunites", label: "Opportunités" },
  { id: "parc", label: "Parc" },
  { id: "infos", label: "Infos" },
];

export default function FicheCompte() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [compte, setCompte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("activite");

  useEffect(() => {
    (async () => {
      try {
        const c = await base44.entities.Compte.get(id);
        setCompte(c);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gd-mist border-t-gd-blue" />
      </div>
    );
  }

  if (!compte) {
    return (
      <div className="p-8 text-center text-muted-foreground">Compte introuvable</div>
    );
  }

  const tel = compte.telephone_1 || compte.telephone_2;
  const dept = DEPARTEMENTS.find((d) => d.code === compte.departement);

  return (
    <div className="animate-fade-in">
      {/* Sticky header */}
      <div className="sticky top-16 z-10 bg-gd-blue px-4 py-4 text-white lg:px-8">
        <div className="mx-auto max-w-5xl">
          <button onClick={() => navigate("/comptes")} className="mb-2 flex items-center gap-1 text-xs text-white/60 hover:text-white">
            <ChevronLeft className="h-3.5 w-3.5" /> Comptes
          </button>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="gd-title truncate text-lg lg:text-xl">{compte.raison_sociale}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <StatutBadge statut={compte.statut || "À qualifier"} />
                {compte.segment && <SegmentBadge segment={compte.segment} />}
                <PotentielBadge potentiel={compte.potentiel} />
                <ScoreBadge score={compte.score} />
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {tel && (
              <a href={`tel:${tel.replace(/\s/g, "")}`} className="flex items-center gap-1.5 rounded-lg bg-gd-yellow px-3 py-2 text-xs font-bold text-gd-black active:scale-95">
                <Phone className="h-3.5 w-3.5" /> Appeler
              </a>
            )}
            {compte.email && (
              <a href={`mailto:${compte.email}`} className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white active:scale-95">
                <Mail className="h-3.5 w-3.5" /> Email
              </a>
            )}
            {compte.latitude && compte.longitude && (
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${compte.latitude},${compte.longitude}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white active:scale-95">
                <MapPin className="h-3.5 w-3.5" /> Itinéraire
              </a>
            )}
            <button className="flex items-center gap-1.5 rounded-lg bg-gd-yellow/90 px-3 py-2 text-xs font-bold text-gd-black active:scale-95">
              <Mic className="h-3.5 w-3.5" /> Rapport oral
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[13.5rem] z-[5] border-b border-gd-mist/40 bg-gd-ice/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 lg:px-8 gd-scrollbar-thin">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition ${
                tab === t.id ? "border-gd-blue text-gd-blue" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-5xl p-4 lg:p-8">
        {tab === "activite" && <ActiviteTab compteId={id} />}
        {tab === "contacts" && <ContactsTab compteId={id} />}
        {tab === "opportunites" && <OpportunitesTab compteId={id} />}
        {tab === "parc" && <ParcTab compteId={id} />}
        {tab === "infos" && <InfosTab compte={compte} onUpdate={setCompte} />}
      </div>
    </div>
  );
}