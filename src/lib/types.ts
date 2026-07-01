// Représentation d'une pièce jointe Airtable (champ "Photo")
export interface AirtableAttachment {
  id: string;
  url: string;
  filename: string;
  type?: string;
  thumbnails?: {
    small?: { url: string; width: number; height: number };
    large?: { url: string; width: number; height: number };
  };
}

// Champs bruts tels que renvoyés par l'API Airtable.
// Les noms correspondent exactement aux colonnes de la table.
export interface ProductFields {
  Principal?: number;
  "Chez qui"?: string;
  "Close ou openend"?: string;
  Coated?: string;
  Commentaire_Bertrand?: string;
  Commentaire_Tunisie?: string;
  "Couleur curseur"?: string;
  "Couleur maille"?: string;
  "Couleur ruban"?: string;
  "Couleur tirette"?: string;
  "Double curseur ?"?: string;
  Fournisseur?: string;
  Photo?: AirtableAttachment[];
  "Prix Unitaire"?: number;
  Produit?: string;
  Produit1?: string;
  Produit2?: string;
  "Quantité"?: number;
  "Reverse ?"?: string;
  "Référence"?: string;
  Taille?: number;
  "Taille maille"?: string;
  "Tirette/Curseur"?: string;
  Total?: number;
  updated_at?: string;
  "date d'arrivée"?: string;
}

export interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: ProductFields;
}

// Objet produit simplifié exposé au front.
export interface Product {
  id: string;
  fields: ProductFields;
}
