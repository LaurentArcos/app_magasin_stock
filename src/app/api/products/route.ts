import { NextRequest, NextResponse } from "next/server";
import { createProduct, searchProducts } from "@/lib/airtable";
import type { ProductFields } from "@/lib/types";

export const dynamic = "force-dynamic";

// Champs calculés / non renseignables via l'API records.
const READONLY_FIELDS = new Set(["Total", "Principal", "updated_at", "Photo"]);

// GET /api/products?q=terme  -> recherche par nom de produit
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 1) {
    return NextResponse.json({ records: [] });
  }

  try {
    const records = await searchProducts(q);
    return NextResponse.json({ records });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/products  -> crée un produit (réservé à l'admin)
// Corps : { fields: { "<Nom colonne>": valeur, ... } }
export async function POST(req: NextRequest) {
  const adminCode = req.headers.get("x-admin-code");
  const isAdmin =
    !!process.env.ADMIN_CODE && adminCode === process.env.ADMIN_CODE;
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Code administrateur requis" },
      { status: 403 }
    );
  }

  let body: { fields?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const incoming =
    body.fields && typeof body.fields === "object"
      ? (body.fields as Record<string, unknown>)
      : {};

  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (READONLY_FIELDS.has(key)) continue;
    if (value === "" || value === null || value === undefined) continue;

    if (key === "Quantité" || key === "Prix Unitaire" || key === "Taille") {
      const n = Number(value);
      if (Number.isNaN(n) || n < 0) {
        return NextResponse.json(
          { error: `Valeur invalide pour « ${key} »` },
          { status: 400 }
        );
      }
      fields[key] = n;
      continue;
    }
    fields[key] = value;
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json(
      { error: "Aucun champ renseigné" },
      { status: 400 }
    );
  }

  try {
    const record = await createProduct(fields as Partial<ProductFields>);
    return NextResponse.json({ record });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
