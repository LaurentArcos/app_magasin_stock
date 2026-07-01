import { NextRequest, NextResponse } from "next/server";
import { getProduct, updateProduct } from "@/lib/airtable";
import type { ProductFields } from "@/lib/types";

export const dynamic = "force-dynamic";

// Champs calculés / non modifiables via l'API records.
const READONLY_FIELDS = new Set(["Total", "Principal", "updated_at", "Photo"]);

// Champs modifiables par tout le monde (sans code admin).
const PUBLIC_FIELDS = new Set(["Quantité", "Commentaire_Tunisie"]);

// GET /api/products/:id  -> fiche complète d'un produit
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const record = await getProduct(params.id);
    return NextResponse.json({ record });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/products/:id
// Corps : { fields: { "<Nom colonne Airtable>": valeur, ... } }
// - La quantité est modifiable par tout le monde.
// - Tous les autres champs nécessitent le code admin (en-tête "x-admin-code").
// - Les champs calculés (Total, N°, date de modif, Photo) sont ignorés.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const adminCode = req.headers.get("x-admin-code");
  const isAdmin = !!process.env.ADMIN_CODE && adminCode === process.env.ADMIN_CODE;

  const fields: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(incoming)) {
    if (READONLY_FIELDS.has(key)) continue; // non modifiable

    // Sans code admin : seuls les champs publics sont autorisés.
    if (!isAdmin && !PUBLIC_FIELDS.has(key)) {
      return NextResponse.json(
        { error: `Code administrateur requis pour modifier « ${key} »` },
        { status: 403 }
      );
    }

    // Validation des champs numériques connus.
    if (key === "Quantité" || key === "Prix Unitaire" || key === "Taille") {
      if (value === null || value === "") {
        fields[key] = null;
      } else {
        const n = Number(value);
        if (Number.isNaN(n) || n < 0) {
          return NextResponse.json(
            { error: `Valeur invalide pour « ${key} »` },
            { status: 400 }
          );
        }
        fields[key] = n;
      }
      continue;
    }

    fields[key] = value === "" ? null : value;
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json(
      { error: "Aucun champ à mettre à jour" },
      { status: 400 }
    );
  }

  try {
    const record = await updateProduct(params.id, fields as Partial<ProductFields>);
    return NextResponse.json({ record });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
