// Constantes métier CRM Gonnin-Duris

export const STATUTS_COMPTE = [
  "À qualifier",
  "Prospect",
  "Contacté",
  "RDV planifié",
  "Offre en cours",
  "Client",
  "Perdu",
  "Hors cible",
];

export const STATUT_COULEUR = {
  "À qualifier": { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" },
  Prospect: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  Contacté: { bg: "bg-cyan-100", text: "text-cyan-700", dot: "bg-cyan-500" },
  "RDV planifié": { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500" },
  "Offre en cours": { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  Client: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  Perdu: { bg: "bg-rose-100", text: "text-rose-700", dot: "bg-rose-500" },
  "Hors cible": { bg: "bg-zinc-200", text: "text-zinc-600", dot: "bg-zinc-400" },
};

// Étapes principales du cycle de prospection (hors issues terminales Perdu/Hors cible)
export const PIPELINE_STEPS = [
  "À qualifier",
  "Prospect",
  "Contacté",
  "RDV planifié",
  "Offre en cours",
  "Client",
];

// Avancement d'un compte dans le cycle de prospection, pour affichage (barre, stepper)
export function pipelineAvancement(statut) {
  if (statut === "Perdu" || statut === "Hors cible") {
    return { index: -1, total: PIPELINE_STEPS.length, pct: statut === "Perdu" ? 100 : 0, special: statut };
  }
  const idx = PIPELINE_STEPS.indexOf(statut);
  const i = idx === -1 ? 0 : idx;
  return {
    index: i,
    total: PIPELINE_STEPS.length,
    pct: Math.round(((i + 1) / PIPELINE_STEPS.length) * 100),
    special: null,
  };
}

export const FAMILLES = ["Espaces verts", "Collectivité"];

export const SEGMENTS = [
  "Paysagiste",
  "Élagueur",
  "Équestre",
  "Maraîcher",
  "Golf/stade",
  "Commune",
  "Intercommunalité",
  "Syndicat",
  "Département",
  "Association",
  "Autre",
];

export const DEPARTEMENTS = [
  { code: "16", nom: "Charente" },
  { code: "79", nom: "Deux-Sèvres" },
  { code: "86", nom: "Vienne" },
];

export const POTENTIELS = ["A", "B", "C"];

export const POTENTIEL_COULEUR = {
  A: "bg-gd-yellow text-gd-black",
  B: "bg-slate-200 text-slate-700",
  C: "bg-slate-100 text-slate-500",
};

export const ETAPES_OPPORTUNITE = [
  "Détection",
  "Besoin qualifié",
  "Démo",
  "Devis envoyé",
  "Négociation",
  "Gagné",
  "Perdu",
];

export const PROBABILITE_ETAPE = {
  Détection: 10,
  "Besoin qualifié": 25,
  Démo: 40,
  "Devis envoyé": 50,
  Négociation: 75,
  Gagné: 100,
  Perdu: 0,
};

export const GAMMES = [
  "Tondeuses autoportées",
  "Tracteurs compacts",
  "Broyeurs/épareuses",
  "Outils de désherbage",
  "Utilitaires",
  "Pièces/SAV",
  "Location",
];

export const TYPES_INTERACTION = ["Appel", "Visite", "Email", "Démo", "Salon", "SMS"];

export const RESULTATS_INTERACTION = [
  "Pas joignable",
  "À rappeler",
  "Intéressé",
  "Pas intéressé",
  "RDV pris",
  "Devis demandé",
];

export const TYPES_TACHE = ["Rappel", "Visite", "Envoi devis", "Relance devis", "Démo", "Admin"];

export const PRIORITES = ["Haute", "Normale"];

export const STATUTS_TACHE = ["À faire", "Fait", "Reporté"];

export const TAILLES_COMMUNE = ["<500", "500-2 000", "2 000-10 000", ">10 000"];
export const TAILLES_ENTREPRISE = ["0", "1-5", "6-20", ">20"];

export const CONCESSIONS = [
  "Gonnin-Duris Angoulême",
  "Gonnin-Duris Niort",
  "Gonnin-Duris Poitiers",
  "Gonnin-Duris Cognac",
  "Gonnin-Duris Bressuire",
];

export const ROLES = ["Admin", "Chef des ventes", "Commerciale", "Lecteur"];

export const SOURCES = ["Fichier initial", "Salon", "Recommandation", "Entrant"];

export const CONSENTEMENTS = ["Non renseigné", "OK prospection", "Opposition"];

export const TEMPERATURES = ["Froid", "Tiède", "Chaud"];

export const TEMPERATURE_COULEUR = {
  Froid: "bg-blue-100 text-blue-700",
  Tiède: "bg-amber-100 text-amber-700",
  Chaud: "bg-rose-100 text-rose-700",
};

// Normalise un téléphone stocké en nombre vers 0X XX XX XX XX
export function normaliserTelephone(val) {
  if (val == null) return "";
  let s = String(val).replace(/\D/g, "");
  if (s.length === 9) s = "0" + s;
  if (s.length !== 10) return String(val);
  return s.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5");
}

// Extrait code postal + ville d'une chaîne "16000 ANGOULEME"
export function extraireCodePostalVille(val) {
  if (!val) return { code_postal: "", ville: "" };
  const s = String(val).trim();
  const m = s.match(/^(\d{4,5})\s+(.*)$/);
  if (m) return { code_postal: m[1].padStart(5, "0"), ville: m[2] };
  return { code_postal: "", ville: s };
}

export function formatDateCourt(d) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export function formatDateHeure(d) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMontant(n) {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}