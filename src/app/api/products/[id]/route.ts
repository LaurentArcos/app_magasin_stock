import { NextRequest, NextResponse } from "next/server";
import { getProduct, updateProduct } from "@/lib/airtable";
import type { ProductFields } from "@/lib/types";

export const dynamic = "force-dynamic";

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
// Corps attendu : { quantite?: number, prixUnitaire?: number }
// La quantité est modifiable par tout le monde.
// Le prix unitaire requiert le code admin via l'en-tête "x-admin-code".
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: { quantite?: unknown; prixUnitaire?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const fields: Partial<ProductFields> = {};

  // Quantité
  if (body.quantite !== undefined && body.quantite !== null) {
    const qte = Number(body.quantite);
    if (Number.isNaN(qte) || qte < 0) {
      return NextResponse.json(
        { error: "Quantité invalide" },
        { status: 400 }
      );
    }
    fields["Quantité"] = qte;
  }

  // Prix unitaire -> nécessite le code admin
  if (body.prixUnitaire !== undefined && body.prixUnitaire !== null) {
    const adminCode = req.headers.get("x-admin-code");
    if (!process.env.ADMIN_CODE || adminCode !== process.env.ADMIN_CODE) {
      return NextResponse.json(
        { error: "Code administrateur requis ou invalide pour modifier le prix" },
        { status: 403 }
      );
    }
    const prix = Number(body.prixUnitaire);
    if (Number.isNaN(prix) || prix < 0) {
      return NextResponse.json({ error: "Prix invalide" }, { status: 400 });
    }
    fields["Prix Unitaire"] = prix;
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json(
      { error: "Aucun champ à mettre à jour" },
      { status: 400 }
    );
  }

  try {
    const record = await updateProduct(params.id, fields);
    return NextResponse.json({ record });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
