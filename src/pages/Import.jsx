import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import PageTitle from "@/components/PageTitle";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function Import() {
  const fileRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | processing | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleFile = async (file) => {
    if (!file) return;
    setStatus("uploading");
    setError("");
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      setStatus("processing");
      const res = await base44.functions.invoke("importProspects", { file_uri, filename: file.name });
      setResult(res);
      setStatus("done");
    } catch (e) {
      console.error(e);
      setError(e.message || "Erreur lors de l'import");
      setStatus("error");
    }
  };

  return (
    <div className="animate-fade-in">
      <PageTitle subtitle="Importez votre fichier de prospects (Excel/CSV)">Import & qualité</PageTitle>
      <div className="space-y-5 p-4 lg:max-w-3xl lg:p-8">
        <div
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer rounded-xl border-2 border-dashed border-gd-mist/60 bg-white p-10 text-center transition hover:border-gd-blue hover:bg-gd-ice"
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {status === "idle" && (
            <>
              <Upload className="mx-auto h-10 w-10 text-gd-mist" />
              <p className="mt-3 text-sm font-medium">Cliquez pour sélectionner un fichier</p>
              <p className="mt-1 text-xs text-muted-foreground">Formats acceptés : Excel (.xlsx), CSV</p>
            </>
          )}
          {status === "uploading" && (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-gd-blue" />
              <p className="mt-3 text-sm font-medium">Téléversement du fichier…</p>
            </>
          )}
          {status === "processing" && (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-gd-blue" />
              <p className="mt-3 text-sm font-medium">Traitement et normalisation…</p>
              <p className="mt-1 text-xs text-muted-foreground">Dédoublonnage, formatage des téléphones, extraction des codes postaux</p>
            </>
          )}
          {status === "done" && result && (
            <>
              <CheckCircle className="mx-auto h-10 w-10 text-emerald-500" />
              <p className="mt-3 text-sm font-semibold">Import terminé</p>
              <div className="mt-3 inline-flex flex-wrap justify-center gap-3 text-xs">
                <span className="rounded-lg bg-gd-ice px-3 py-1.5"><strong>{result.created || 0}</strong> créés</span>
                <span className="rounded-lg bg-gd-ice px-3 py-1.5"><strong>{result.duplicates || 0}</strong> doublons ignorés</span>
                <span className="rounded-lg bg-gd-ice px-3 py-1.5"><strong>{result.errors || 0}</strong> erreurs</span>
              </div>
            </>
          )}
          {status === "error" && (
            <>
              <AlertCircle className="mx-auto h-10 w-10 text-gd-danger" />
              <p className="mt-3 text-sm font-medium text-gd-danger">Échec de l'import</p>
              <p className="mt-1 text-xs text-muted-foreground">{error}</p>
            </>
          )}
        </div>

        {/* Normalisation info */}
        <div className="rounded-xl border border-gd-mist/40 bg-white p-4">
          <h3 className="gd-title mb-3 text-sm text-gd-blue">Normalisations appliquées</h3>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex items-start gap-2"><FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-gd-blue" /> Téléphones normalisés au format 0X XX XX XX XX</li>
            <li className="flex items-start gap-2"><FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-gd-blue" /> Code postal et ville séparés depuis la colonne « Ville »</li>
            <li className="flex items-start gap-2"><FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-gd-blue" /> SIREN converti en texte 9 chiffres</li>
            <li className="flex items-start gap-2"><FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-gd-blue" /> Dédoublonnage par SIREN puis raison sociale + code postal</li>
            <li className="flex items-start gap-2"><FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-gd-blue" /> Département détecté depuis le code postal (16, 79, 86)</li>
            <li className="flex items-start gap-2"><FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-gd-blue" /> Famille et segment détectés depuis l'onglet et la raison sociale</li>
          </ul>
        </div>
      </div>
    </div>
  );
}