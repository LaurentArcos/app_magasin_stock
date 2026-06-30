import { NextResponse } from "next/server";
import { getAllProducts } from "@/lib/airtable";

export const dynamic = "force-dynamic";

// GET /api/products/all -> tous les enregistrements (pour le cache hors ligne)
export async function GET() {
  try {
    const records = await getAllProducts();
    return NextResponse.json({ records, syncedAt: Date.now() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
