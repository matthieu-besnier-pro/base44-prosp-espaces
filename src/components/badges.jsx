import { STATUT_COULEUR, POTENTIEL_COULEUR } from "@/lib/crm-constants";

export function StatutBadge({ statut }) {
  const c = STATUT_COULEUR[statut] || STATUT_COULEUR["À qualifier"];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${c.bg} ${c.text} px-2.5 py-0.5 text-xs font-semibold`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {statut}
    </span>
  );
}

export function PotentielBadge({ potentiel }) {
  if (!potentiel) return null;
  const c = POTENTIEL_COULEUR[potentiel] || POTENTIEL_COULEUR.C;
  return (
    <span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-extrabold ${c}`}>
      {potentiel}
    </span>
  );
}

export function ScoreBadge({ score }) {
  if (score == null) return null;
  const color = score >= 70 ? "text-gd-blue" : score >= 40 ? "text-gd-navy" : "text-slate-400";
  return (
    <span className={`gd-tabular inline-flex items-center rounded-md bg-gd-ice px-1.5 py-0.5 text-xs font-bold ${color}`}>
      {score}
    </span>
  );
}

export function SegmentBadge({ segment }) {
  if (!segment) return null;
  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
      {segment}
    </span>
  );
}