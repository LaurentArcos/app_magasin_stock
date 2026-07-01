// Couche de données locale (hors ligne) basée sur IndexedDB.
// - cache de tous les produits (consultation/recherche hors ligne)
// - file d'attente "outbox" des modifications faites hors ligne

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { AirtableRecord, ProductFields } from "./types";

export interface OutboxItem {
  localId?: number;
  recordId: string;
  kind: "fields" | "photo";
  // modif de champs : noms de colonnes Airtable -> valeurs
  fields?: Record<string, unknown>;
  adminCode?: string | null;
  // modif de photo
  file?: string; // base64
  contentType?: string;
  filename?: string;
  ts: number;
}

interface StockDB extends DBSchema {
  products: {
    key: string;
    value: AirtableRecord;
  };
  meta: {
    key: string;
    value: number | string;
  };
  outbox: {
    key: number;
    value: OutboxItem;
  };
}

let dbPromise: Promise<IDBPDatabase<StockDB>> | null = null;

function getDB() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB indisponible côté serveur");
  }
  if (!dbPromise) {
    dbPromise = openDB<StockDB>("magasin-stock", 1, {
      upgrade(db) {
        db.createObjectStore("products", { keyPath: "id" });
        db.createObjectStore("meta");
        db.createObjectStore("outbox", {
          keyPath: "localId",
          autoIncrement: true,
        });
      },
    });
  }
  return dbPromise;
}

// --- Cache produits ---

export async function cacheAllProducts(records: AirtableRecord[]) {
  const db = await getDB();
  const tx = db.transaction("products", "readwrite");
  await tx.store.clear();
  for (const r of records) await tx.store.put(r);
  await tx.done;
  await setMeta("lastSync", Date.now());
}

export async function upsertCachedProduct(record: AirtableRecord) {
  const db = await getDB();
  await db.put("products", record);
}

export async function getCachedProducts(): Promise<AirtableRecord[]> {
  const db = await getDB();
  return db.getAll("products");
}

export async function getCachedProduct(
  id: string
): Promise<AirtableRecord | undefined> {
  const db = await getDB();
  return db.get("products", id);
}

export async function setMeta(key: string, value: number | string) {
  const db = await getDB();
  await db.put("meta", value, key);
}

export async function getLastSync(): Promise<number | null> {
  const db = await getDB();
  const v = await db.get("meta", "lastSync");
  return typeof v === "number" ? v : null;
}

// --- Synchro descendante (serveur -> cache) ---

export async function syncDown(): Promise<number> {
  const res = await fetch("/api/products/all", { cache: "no-store" });
  if (!res.ok) throw new Error("sync failed");
  const data = (await res.json()) as { records: AirtableRecord[] };
  await cacheAllProducts(data.records);
  return data.records.length;
}

// --- Recherche locale ---

function nameMatch(r: AirtableRecord, q: string): boolean {
  const f = r.fields;
  const haystack = [
    f.Produit,
    f.Produit1,
    f.Produit2,
    f["Référence"],
    f.Fournisseur,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export async function searchProductsLocal(
  query: string
): Promise<AirtableRecord[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = await getCachedProducts();
  return all.filter((r) => nameMatch(r, q)).slice(0, 50);
}

// --- Mises à jour optimistes du cache ---

export async function applyLocalFields(
  id: string,
  fields: Record<string, unknown>
) {
  const current = await getCachedProduct(id);
  if (!current) return;
  const updated: AirtableRecord = {
    ...current,
    fields: { ...current.fields, ...(fields as Partial<ProductFields>) },
  };
  await upsertCachedProduct(updated);
}

export async function applyLocalPhoto(id: string, dataUrl: string) {
  const current = await getCachedProduct(id);
  if (!current) return;
  const updated: AirtableRecord = {
    ...current,
    fields: {
      ...current.fields,
      Photo: [
        {
          id: `local-${Date.now()}`,
          url: dataUrl,
          filename: "photo-local.jpg",
          type: "image/jpeg",
        },
      ],
    },
  };
  await upsertCachedProduct(updated);
}

// --- Outbox (file d'attente) ---

export async function enqueue(item: OutboxItem) {
  const db = await getDB();
  await db.add("outbox", item);
}

export async function getOutbox(): Promise<OutboxItem[]> {
  const db = await getDB();
  const items = await db.getAll("outbox");
  return items.sort((a, b) => (a.localId ?? 0) - (b.localId ?? 0));
}

export async function outboxCount(): Promise<number> {
  const db = await getDB();
  return db.count("outbox");
}

async function removeOutbox(localId: number) {
  const db = await getDB();
  await db.delete("outbox", localId);
}

// --- Envoi réseau d'une modif (utilisé en direct ET au flush) ---

export async function sendFields(
  recordId: string,
  payload: { fields: Record<string, unknown>; adminCode?: string | null }
): Promise<AirtableRecord> {
  const res = await fetch(`/api/products/${recordId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(payload.adminCode ? { "x-admin-code": payload.adminCode } : {}),
    },
    body: JSON.stringify({ fields: payload.fields }),
  });
  if (!res.ok) throw new Error("send fields failed");
  const data = (await res.json()) as { record: AirtableRecord };
  await upsertCachedProduct(data.record);
  return data.record;
}

export async function createProduct(
  fields: Record<string, unknown>,
  adminCode: string | null
): Promise<AirtableRecord> {
  const res = await fetch("/api/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(adminCode ? { "x-admin-code": adminCode } : {}),
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error("create failed");
  const data = (await res.json()) as { record: AirtableRecord };
  await upsertCachedProduct(data.record);
  return data.record;
}

export async function sendPhoto(
  recordId: string,
  payload: { file: string; contentType: string; filename: string }
): Promise<AirtableRecord> {
  const res = await fetch(`/api/products/${recordId}/photo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("send photo failed");
  const data = (await res.json()) as { record: AirtableRecord };
  await upsertCachedProduct(data.record);
  return data.record;
}

/**
 * Vide la file d'attente vers le serveur, dans l'ordre.
 * S'arrête à la première erreur (réessai au prochain passage en ligne).
 * Renvoie le nombre d'éléments synchronisés.
 */
export async function flushOutbox(): Promise<number> {
  const items = await getOutbox();
  let done = 0;
  for (const item of items) {
    try {
      if (item.kind === "fields") {
        await sendFields(item.recordId, {
          fields: item.fields ?? {},
          adminCode: item.adminCode,
        });
      } else if (item.kind === "photo" && item.file && item.contentType) {
        await sendPhoto(item.recordId, {
          file: item.file,
          contentType: item.contentType,
          filename: item.filename ?? "photo.jpg",
        });
      }
      if (item.localId !== undefined) await removeOutbox(item.localId);
      done++;
    } catch {
      break; // on réessaiera plus tard
    }
  }
  return done;
}
