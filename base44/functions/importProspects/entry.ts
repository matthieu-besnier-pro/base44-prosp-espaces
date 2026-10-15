import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import * as XLSX from 'npm:xlsx@0.18.5';

function normaliserTel(val) {
  if (val == null) return "";
  let s = String(val).replace(/\D/g, "");
  if (s.length === 9) s = "0" + s;
  if (s.length !== 10) return "";
  return s.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5");
}

function extraireCpVille(val) {
  if (!val) return { code_postal: "", ville: "" };
  const s = String(val).trim();
  const m = s.match(/^(\d{4,5})\s+(.*)$/);
  if (m) return { code_postal: m[1].padStart(5, "0"), ville: m[2].trim() };
  return { code_postal: "", ville: s };
}

function detecterSegment(raison, situation) {
  const r = (raison || "").toLowerCase();
  const s = (situation || "").toLowerCase();
  const txt = r + " " + s;
  if (/haras|équestre|equestre|écurie|ecurie|centre équestre/.test(txt)) return "Équestre";
  if (/élagag|elagag|élague|elague/.test(txt)) return "Élagueur";
  if (/maraîch|maraich|légume|legume|fruit|verger/.test(txt)) return "Maraîcher";
  if (/golf|stade/.test(txt)) return "Golf/stade";
  if (/paysag|jardin|espace vert|hortic/.test(txt)) return "Paysagiste";
  if (/commune|mairie/.test(r)) return "Commune";
  if (/communauté|agglo|agglomération|communaut|cc de|cc d/.test(r)) return "Intercommunalité";
  if (/syndicat|sivom|sivu|syndic/.test(r)) return "Syndicat";
  if (/conseil départemental|départemental/.test(r)) return "Département";
  if (/assoc/.test(r)) return "Association";
  return "Autre";
}

function detecterDept(codePostal) {
  const cp = String(codePostal || "").padStart(5, "0");
  if (cp.startsWith("16")) return "16";
  if (cp.startsWith("79")) return "79";
  if (cp.startsWith("86")) return "86";
  return "";
}

function nettoyerRaison(s) {
  return String(s || "").replace(/\s+/g, " ").replace(/\?/g, " ").trim().toUpperCase();
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const { file_uri } = body;
    if (!file_uri) return Response.json({ error: "file_uri requis" }, { status: 400 });

    // Créer une URL signée pour le fichier privé
    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 600 });

    // Télécharger le fichier
    const resp = await fetch(signed_url, { signal: AbortSignal.timeout(30000) });
    if (!resp.ok) return Response.json({ error: "Impossible de télécharger le fichier" }, { status: 500 });
    const buf = await resp.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });

    const comptes = [];
    const seenSiren = new Set();
    const seenNameCp = new Set();

    // Traiter les deux onglets utiles
    const sheets = [
      { name: "ESPACES VERTS", famille: "Espaces verts" },
      { name: "COLLECTIVITES", famille: "Collectivité" },
    ];

    for (const sheet of sheets) {
      if (!wb.SheetNames.includes(sheet.name)) continue;
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet.name], { defval: null });
      for (const row of rows) {
        const raison = nettoyerRaison(row["RAISON SOCIALE"] || row["Raison Sociale"]);
        if (!raison) continue;

        let siren = row["Siren"] || row["SIREN"];
        if (siren != null) {
          siren = String(siren).replace(/\D/g, "");
          if (siren.length > 9) siren = siren.slice(0, 9);
          if (siren.length < 9 && siren.length > 0) siren = siren.padStart(9, "0");
          if (siren === "0".repeat(9) || siren.length !== 9) siren = "";
        }

        const villeRaw = row["Ville"] || row["VILLE"] || "";
        const { code_postal, ville } = extraireCpVille(villeRaw);
        const departement = detecterDept(code_postal);

        const situation = row["Situation "] || row["Situation"] || row["col_6"] || "";
        const segment = detecterSegment(raison, situation);

        let tel1 = normaliserTel(row["Télephone"] || row["Télephone 1"] || row["Téléphone"] || row["Téléphone 1"]);
        let tel2 = normaliserTel(row["Télephone 2"] || row["Téléphone 2"] || row["Téléphone "] || row["col_6"]);
        if (tel1 && tel2 && tel1 === tel2) tel2 = "";

        // Dédoublonnage
        if (siren && seenSiren.has(siren)) continue;
        if (siren) seenSiren.add(siren);
        const nameCpKey = raison + "|" + code_postal;
        if (!siren && seenNameCp.has(nameCpKey)) continue;
        if (!siren) seenNameCp.add(nameCpKey);

        comptes.push({
          raison_sociale: raison,
          siren: siren || undefined,
          famille: sheet.famille,
          segment,
          activite_detail: situation || undefined,
          adresse: (row["ADRESSE"] || row["Adresse"] || "").trim() || undefined,
          code_postal: code_postal || undefined,
          ville: ville || undefined,
          departement: departement || undefined,
          telephone_1: tel1 || undefined,
          telephone_2: tel2 || undefined,
          email: (row["Email"] || "").trim() || undefined,
          statut: "À qualifier",
          consentement_rgpd: "Non renseigné",
          source: "Fichier initial",
          score: 5,
        });
      }
    }

    // bulkCreate par lots de 500
    let created = 0;
    let errors = 0;
    for (let i = 0; i < comptes.length; i += 500) {
      const batch = comptes.slice(i, i + 500);
      try {
        await base44.asServiceRole.entities.Compte.bulkCreate(batch);
        created += batch.length;
      } catch (e) {
        errors += batch.length;
        console.error("Batch error:", e.message);
      }
    }

    return Response.json({
      created,
      duplicates: comptes.length - created - errors,
      errors,
      total: comptes.length,
    });
  } catch (error) {
    console.error("Import error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}