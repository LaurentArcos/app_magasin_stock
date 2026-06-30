import type { AirtableRecord, ProductFields } from "./types";

// --- Configuration (côté serveur uniquement) ---
const TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_ID = process.env.AIRTABLE_TABLE_ID;

const API_BASE = "https://api.airtable.com/v0";
const CONTENT_BASE = "https://content.airtable.com/v0";

function assertConfig() {
  if (!TOKEN || !BASE_ID || !TABLE_ID) {
    throw new Error(
      "Configuration Airtable manquante. Vérifie AIRTABLE_TOKEN, AIRTABLE_BASE_ID et AIRTABLE_TABLE_ID dans .env.local"
    );
  }
}

function headers() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  };
}

function tableUrl() {
  return `${API_BASE}/${BASE_ID}/${encodeURIComponent(TABLE_ID as string)}`;
}

// Échappe une valeur pour une formule Airtable.
function escapeFormulaValue(value: string) {
  return value.replace(/"/g, '\\"');
}

/**
 * Recherche des produits dont le nom (Produit / Produit1 / Produit2 / Référence)
 * contient le terme saisi (insensible à la casse).
 */
export async function searchProducts(query: string): Promise<AirtableRecord[]> {
  assertConfig();

  const q = escapeFormulaValue(query.trim().toLowerCase());
  // On concatène les champs pertinents et on cherche la sous-chaîne.
  const formula = `SEARCH("${q}", LOWER(CONCATENATE({Produit}&"", {Produit1}&"", {Produit2}&"", {Référence}&"", {Fournisseur}&"")))`;

  const params = new URLSearchParams({
    filterByFormula: formula,
    pageSize: "25",
  });

  const res = await fetch(`${tableUrl()}?${params.toString()}`, {
    headers: headers(),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erreur Airtable (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { records: AirtableRecord[] };
  return data.records;
}

/** Récupère TOUS les enregistrements (pagination Airtable) pour le cache local. */
export async function getAllProducts(): Promise<AirtableRecord[]> {
  assertConfig();

  const all: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);

    const res = await fetch(`${tableUrl()}?${params.toString()}`, {
      headers: headers(),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Erreur Airtable (${res.status}): ${text}`);
    }

    const data = (await res.json()) as {
      records: AirtableRecord[];
      offset?: string;
    };
    all.push(...data.records);
    offset = data.offset;
  } while (offset);

  return all;
}

/** Récupère un enregistrement par son id. */
export async function getProduct(id: string): Promise<AirtableRecord> {
  assertConfig();

  const res = await fetch(`${tableUrl()}/${id}`, {
    headers: headers(),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erreur Airtable (${res.status}): ${text}`);
  }

  return (await res.json()) as AirtableRecord;
}

/**
 * Téléverse une nouvelle photo dans le champ "Photo" (pièce jointe) d'un
 * enregistrement, via l'endpoint d'upload d'Airtable (remplace les existantes
 * n'est PAS automatique : Airtable ajoute la pièce jointe à la liste).
 * Limite Airtable : ~5 Mo par requête.
 */
export async function uploadPhoto(
  recordId: string,
  base64File: string,
  contentType: string,
  filename: string
): Promise<void> {
  assertConfig();

  const url = `${CONTENT_BASE}/${BASE_ID}/${recordId}/${encodeURIComponent(
    "Photo"
  )}/uploadAttachment`;

  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      contentType,
      file: base64File,
      filename,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erreur upload Airtable (${res.status}): ${text}`);
  }
}

/**
 * Remplace la photo : on téléverse la nouvelle puis on supprime les anciennes
 * pièces jointes en réécrivant le champ avec la seule nouvelle.
 */
export async function replacePhoto(
  recordId: string,
  base64File: string,
  contentType: string,
  filename: string
): Promise<AirtableRecord> {
  // 1) Téléverse la nouvelle (Airtable l'ajoute à la liste existante).
  await uploadPhoto(recordId, base64File, contentType, filename);

  // 2) Relit l'enregistrement pour connaître toutes les pièces jointes.
  const current = await getProduct(recordId);
  const photos = current.fields.Photo ?? [];

  // 3) Ne garde que la dernière (la nouvelle) en ne renvoyant que son id.
  if (photos.length > 1) {
    const last = photos[photos.length - 1];
    const fields = { Photo: [{ id: last.id }] } as unknown as Partial<ProductFields>;
    return updateProduct(recordId, fields);
  }

  return current;
}

/** Met à jour des champs d'un enregistrement. */
export async function updateProduct(
  id: string,
  fields: Partial<ProductFields>
): Promise<AirtableRecord> {
  assertConfig();

  const res = await fetch(`${tableUrl()}/${id}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ fields, typecast: true }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erreur Airtable (${res.status}): ${text}`);
  }

  return (await res.json()) as AirtableRecord;
}
