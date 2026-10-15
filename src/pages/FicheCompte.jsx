import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { StatutBadge, PotentielBadge, ScoreBadge, SegmentBadge } from "@/components/badges";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  DEPARTEMENTS, PIPELINE_STEPS, pipelineAvancement, formatDateCourt, formatMontant,
} from "@/lib/crm-constants";
import {
  Phone, Mail, MapPin, ChevronLeft, Mic, Sparkles,
  TrendingUp, CheckCircle2, Circle,
  Activity, Users, Wrench, Settings,
} from "lucide-react";
import ActiviteTab from "@/components/fiche/ActiviteTab";
import ContactsTab from "@/components/fiche/ContactsTab";
import OpportunitesTab from "@/components/fiche/OpportunitesTab";
import ParcTab from "@/components/fiche/ParcTab";
import InfosTab from "@/components/fiche/InfosTab";

export default function FicheCompte() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [compte, setCompte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState(null);

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

  useEffect(() => {
    (async () => {
      try {
        const [opps, tachesAFaire] = await Promise.all([
          base44.entities.Opportunite.filter({ compte_id: id }, { limit: 100, fields: ["etape", "montant_ht"] }),
          base44.entities.Tache.count({ compte_id: id, statut: "À faire" }),
        ]);
        const items = opps.items || opps;
        const pipelineOuvert = items
          .filter((o) => !["Gagné", "Perdu"].includes(o.etape))
          .reduce((s, o) => s + (o.montant_ht || 0), 0);
        setResume({ pipelineOuvert, tachesAFaire });
      } catch (e) {
        console.error(e);
      }
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
      <div className="p-8 text-center text-muted-foreground">Client introuvable</div>
    );
  }

  const tel = compte.telephone_1 || compte.telephone_2;
  const dept = DEPARTEMENTS.find((d) => d.code === compte.departement);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-gd-blue px-4 py-4 text-white lg:px-8">
        <div className="mx-auto max-w-5xl">
          <button onClick={() => navigate("/comptes")} className="mb-2 flex items-center gap-1 text-xs text-white/60 hover:text-white">
            <ChevronLeft className="h-3.5 w-3.5" /> Clients
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
              {(compte.ville || dept) && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-white/60">
                  <MapPin className="h-3 w-3" />
                  {compte.ville} {dept ? `(${dept.code})` : ""}
                </div>
              )}
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

      <div className="mx-auto max-w-5xl space-y-4 p-4 lg:p-8">
        {/* Aperçu compact : KPI + avancement en un seul bloc */}
        <div className="rounded-xl border border-gd-mist/50 bg-white p-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <StatChip label="Score" value={compte.score ?? "—"} />
            <StatChip label="Pipeline ouvert" value={formatMontant(resume?.pipelineOuvert ?? 0)} />
            <StatChip label="Tâches" value={resume?.tachesAFaire ?? "—"} />
            <StatChip label="Dernier contact" value={compte.date_dernier_contact ? formatDateCourt(compte.date_dernier_contact) : "Jamais"} />
          </div>
          <div className="mt-3 border-t border-gd-mist/30 pt-3">
            <PipelineStepper statut={compte.statut} />
          </div>
        </div>

        {/* Assistant IA — compact, invisible si rien à montrer */}
        <AiInsightPanel compte={compte} />

        {/* Détails, repliés par défaut pour rester lisible */}
        <Accordion type="multiple" defaultValue={["activite"]} className="rounded-xl border border-gd-mist/50 bg-white">
          <AccordionSection value="activite" icon={Activity} title="Activité & tâches">
            <ActiviteTab compteId={id} />
          </AccordionSection>
          <AccordionSection value="contacts" icon={Users} title="Contacts">
            <ContactsTab compteId={id} />
          </AccordionSection>
          <AccordionSection value="opportunites" icon={TrendingUp} title="Opportunités">
            <OpportunitesTab compteId={id} />
          </AccordionSection>
          <AccordionSection value="parc" icon={Wrench} title="Parc matériel">
            <ParcTab compteId={id} />
          </AccordionSection>
          <AccordionSection value="infos" icon={Settings} title="Informations générales">
            <InfosTab compte={compte} onUpdate={setCompte} />
          </AccordionSection>
        </Accordion>
      </div>
    </div>
  );
}

function AccordionSection({ value, icon: Icon, title, children }) {
  return (
    <AccordionItem value={value} className="border-gd-mist/40 px-4 last:border-b-0">
      <AccordionTrigger className="gd-title text-sm text-gd-blue hover:no-underline">
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4" strokeWidth={2.2} /> {title}
        </span>
      </AccordionTrigger>
      <AccordionContent>{children}</AccordionContent>
    </AccordionItem>
  );
}

function StatChip({ label, value }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="gd-tabular text-base font-extrabold text-gd-blue">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function PipelineStepper({ statut }) {
  const av = pipelineAvancement(statut || "À qualifier");

  if (av.special) {
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${
        av.special === "Perdu" ? "bg-rose-50 text-gd-danger" : "bg-zinc-100 text-zinc-500"
      }`}>
        {av.special === "Perdu" ? "Opportunité perdue" : "Client hors cible"}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 gd-scrollbar-thin">
      {PIPELINE_STEPS.map((step, i) => {
        const done = i <= av.index;
        return (
          <div key={step} className="flex items-center gap-1">
            <div className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11px] font-semibold ${
              done ? "bg-gd-blue text-white" : "bg-gd-ice text-muted-foreground"
            }`}>
              {done ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
              {step}
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div className={`h-0.5 w-5 shrink-0 rounded ${i < av.index ? "bg-gd-blue" : "bg-gd-mist/60"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function AiInsightPanel({ compte }) {
  const hasInsights = compte.resume_ia || compte.angle_approche_ia || (compte.signaux_ia && compte.signaux_ia.length > 0);
  if (!hasInsights) return null;

  return (
    <section className="rounded-xl border border-gd-yellow/30 bg-gd-yellow/5 p-3">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gd-yellow" />
        <div className="min-w-0 flex-1 space-y-1.5">
          {compte.resume_ia && <p className="line-clamp-2 text-sm text-foreground/80">{compte.resume_ia}</p>}
          {compte.angle_approche_ia && (
            <p className="text-xs"><strong className="font-semibold text-gd-blue">Angle : </strong>{compte.angle_approche_ia}</p>
          )}
          {compte.signaux_ia?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {compte.signaux_ia.slice(0, 4).map((s, i) => (
                <span key={i} className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-gd-navy shadow-sm">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
