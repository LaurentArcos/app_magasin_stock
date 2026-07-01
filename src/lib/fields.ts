// Définitions partagées des champs modifiables (fiche + création).
import type { ProductFields } from "./types";

export type EditType = "text" | "number" | "currency" | "longtext" | "date";

// Tous les champs modifiables (nom de colonne Airtable + type de saisie).
export const EDITABLE: { key: keyof ProductFields; type: EditType }[] = [
  { key: "Quantité", type: "number" },
  { key: "Prix Unitaire", type: "currency" },
  { key: "Produit", type: "text" },
  { key: "Produit1", type: "text" },
  { key: "Produit2", type: "text" },
  { key: "Référence", type: "text" },
  { key: "Fournisseur", type: "text" },
  { key: "Chez qui", type: "text" },
  { key: "Taille", type: "number" },
  { key: "Taille maille", type: "text" },
  { key: "Couleur maille", type: "text" },
  { key: "Couleur ruban", type: "text" },
  { key: "Couleur curseur", type: "text" },
  { key: "Couleur tirette", type: "text" },
  { key: "Tirette/Curseur", type: "text" },
  { key: "Double curseur ?", type: "text" },
  { key: "Close ou openend", type: "text" },
  { key: "Coated", type: "text" },
  { key: "Reverse ?", type: "text" },
  { key: "date d'arrivée", type: "date" },
  { key: "Commentaire_Bertrand", type: "longtext" },
  { key: "Commentaire_Tunisie", type: "longtext" },
];

export function typeOf(key: keyof ProductFields): EditType | undefined {
  return EDITABLE.find((e) => e.key === key)?.type;
}

// Valeur initiale (chaîne) d'un champ pour un formulaire.
export function initValue(v: unknown, type: EditType): string {
  if (v === undefined || v === null) return "";
  if (type === "date") return String(v).slice(0, 10);
  return String(v);
}

// Conversion chaîne -> valeur typée pour Airtable.
export function toTyped(value: string, type: EditType): unknown {
  if (value === "") return null;
  if (type === "number" || type === "currency") {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  return value;
}

// Type HTML de l'input selon le type de champ.
export function inputTypeFor(type: EditType): string {
  if (type === "date") return "date";
  if (type === "number" || type === "currency") return "number";
  return "text";
}
