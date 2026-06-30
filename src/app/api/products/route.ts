import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/airtable";

export const dynamic = "force-dynamic";

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
