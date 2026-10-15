import { DEPARTEMENTS } from "@/lib/crm-constants";
import { base44 } from "@/api/base44Client";

// Calcule le score de priorité 0-100 d'un compte (section 6 du cahier des charges)
export function calculerScore(compte, equipements = [], opportunites = []) {
  let score = 0;

  // Potentiel
  if (compte.potentiel === "A") score += 30;
  else if (compte.potentiel === "B") score += 15;
  else if (compte.potentiel === "C") score += 5;

  // Segment
  const segForts = ["Intercommunalité", "Département", "Paysagiste"];
  const segMoyens = ["Élagueur", "Équestre"];
  if (segForts.includes(compte.segment)) score += 20;
  else if (segMoyens.includes(compte.segment)) score += 15;
  else score += 5;

  // Équipement à renouveler sous 12 mois
  const maintenant = new Date();
  const aRenouveler = equipements.some((e) => {
    if (!e.date_renouvellement_estimee) return false;
    const d = new Date(e.date_renouvellement_estimee);
    const diffMois = (d - maintenant) / (1000 * 60 * 60 * 24 * 30);
    return diffMois > 0 && diffMois <= 12;
  });
  if (aRenouveler) score += 20;

  // Opportunité ouverte
  const oppOuverte = opportunites.some((o) => !["Gagné", "Perdu"].includes(o.etape));
  if (oppOuverte) score += 10;

  // Budget collectivité voté dans les 4 mois
  if (compte.mois_vote_budget) {
    const moisMap = { "Janvier": 0, "Février": 1, "Mars": 2, "Avril": 3, "Mai": 4, "Juin": 5, "Juillet": 6, "Août": 7, "Septembre": 8, "Octobre": 9, "Novembre": 10, "Décembre": 11 };
    const moisIndex = moisMap[compte.mois_vote_budget];
    if (moisIndex != null) {
      const maintenant = new Date();
      const moisActuel = maintenant.getMonth();
      const diff = (moisIndex - moisActuel + 12) % 12;
      if (diff <= 4) score += 10;
    }
  }

  // Joignabilité
  if (compte.telephone_1 || compte.telephone_2) score += 5;

  // Contact décideur identifié (sera affiné avec les contacts)
  if (compte._a_decideur) score += 5;

  // Malus
  if (compte.date_dernier_contact) {
    const d = new Date(compte.date_dernier_contact);
    const diffJours = (maintenant - d) / (1000 * 60 * 60 * 24);
    if (diffJours < 14) score -= 30;
  }

  if (compte.statut === "Client") {
    if (!aRenouveler) score -= 20;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function exportCsv(rows, columns, filename = "export.csv") {
  const escape = (v) => {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return `"${s}"`;
  };
  const header = columns.map((c) => escape(c.label)).join(";");
  const lines = rows.map((r) => columns.map((c) => escape(c.get(r))).join(";"));
  const csv = "\uFEFF" + [header, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function deptLabel(code) {
  const d = DEPARTEMENTS.find((x) => x.code === code);
  return d ? `${d.code} ${d.nom}` : code;
}

// URL de recherche Google, utilisée en secours si l'IA ne trouve rien
export function rechercheTelephoneUrl(compte) {
  const query = [compte.raison_sociale, compte.adresse, compte.code_postal, compte.ville, "téléphone"]
    .filter(Boolean)
    .join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

// Cherche le téléphone fixe d'un compte via l'IA de Base44 (recherche internet réelle),
// et renvoie { telephone, source } — telephone est null si rien de fiable n'a été trouvé.
export async function rechercherTelephoneIA(compte) {
  const adresse = [compte.adresse, compte.code_postal, compte.ville].filter(Boolean).join(" ");
  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu dois trouver le numéro de téléphone fixe professionnel de l'organisme suivant, en France, en cherchant sur internet (site officiel, annuaires professionnels type Pages Jaunes, site de la mairie si c'est une collectivité, etc.).

Nom : ${compte.raison_sociale || ""}
Adresse : ${adresse || "non précisée"}
Département : ${compte.departement || "non précisé"}

Réponds uniquement avec le numéro au format français "0X XX XX XX XX" si tu es raisonnablement confiant qu'il correspond bien à cet organisme précis. Si tu n'es pas sûr ou ne trouves rien, telephone doit être null. N'invente jamais de numéro.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          telephone: { type: ["string", "null"], description: "Numéro de téléphone fixe au format 0X XX XX XX XX, ou null si non trouvé avec certitude" },
          source: { type: ["string", "null"], description: "Brève indication de la source utilisée (ex: site officiel, annuaire, pages jaunes…)" },
        },
        required: ["telephone"],
      },
    });
    return typeof res === "object" && res ? res : { telephone: null, source: null };
  } catch (e) {
    console.error(e);
    return { telephone: null, source: null };
  }
}

function icsEscape(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

const pad2 = (n) => String(n).padStart(2, "0");
const icsDateTime = (d) => `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(d.getMinutes())}00`;
const icsDate = (d) => `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;

// Construit un fichier .ics (RFC 5545) à partir d'une liste de créneaux/RDV.
// event: { uid, date: "yyyy-MM-dd", heure?: "HH:MM", dureeMinutes?, titre, lieu?, description? }
export function buildIcsCalendar(events) {
  const dtstamp = `${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Gonnin-Duris//Prospection CRM//FR", "CALSCALE:GREGORIAN"];

  events.forEach((ev) => {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.uid}@gonnin-duris-crm`);
    lines.push(`DTSTAMP:${dtstamp}`);

    if (ev.heure) {
      const [h, m] = ev.heure.split(":");
      const start = new Date(`${ev.date}T${pad2(h || 0)}:${pad2(m || 0)}:00`);
      const end = new Date(start.getTime() + (ev.dureeMinutes || 60) * 60000);
      lines.push(`DTSTART:${icsDateTime(start)}`);
      lines.push(`DTEND:${icsDateTime(end)}`);
    } else {
      const start = new Date(`${ev.date}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      lines.push(`DTSTART;VALUE=DATE:${icsDate(start)}`);
      lines.push(`DTEND;VALUE=DATE:${icsDate(end)}`);
    }

    lines.push(`SUMMARY:${icsEscape(ev.titre)}`);
    if (ev.lieu) lines.push(`LOCATION:${icsEscape(ev.lieu)}`);
    if (ev.description) lines.push(`DESCRIPTION:${icsEscape(ev.description)}`);
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(filename, events) {
  const content = buildIcsCalendar(events);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}