import { DEPARTEMENTS } from "@/lib/crm-constants";

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