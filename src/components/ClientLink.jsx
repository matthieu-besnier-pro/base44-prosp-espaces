import { Link } from "react-router-dom";

// Nom de compte cliquable, renvoyant vers sa fiche. newTab évite de perdre un
// travail en cours (ex. tournée en préparation) quand on consulte la fiche.
export default function ClientLink({ compte, className = "", newTab = false }) {
  if (!compte?.id) {
    return <span className={className}>{compte?.raison_sociale || "—"}</span>;
  }
  return (
    <Link
      to={`/comptes/${compte.id}`}
      onClick={(e) => e.stopPropagation()}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noreferrer" : undefined}
      className={`truncate hover:text-gd-blue hover:underline ${className}`}
    >
      {compte.raison_sociale}
    </Link>
  );
}
