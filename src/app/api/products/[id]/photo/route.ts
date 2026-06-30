import { NextRequest, NextResponse } from "next/server";
import { replacePhoto } from "@/lib/airtable";

export const dynamic = "force-dynamic";

// Limite de sécurité (Airtable accepte ~5 Mo ; on garde une marge).
const MAX_BYTES = 5 * 1024 * 1024;

// POST /api/products/:id/photo
// Corps : { file: base64, contentType: string, filename: string }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: { file?: unknown; contentType?: unknown; filename?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const file = typeof body.file === "string" ? body.file : "";
  const contentType =
    typeof body.contentType === "string" ? body.contentType : "";
  const filename =
    typeof body.filename === "string" && body.filename
      ? body.filename
      : "photo.jpg";

  if (!file || !contentType.startsWith("image/")) {
    return NextResponse.json(
      { error: "Image manquante ou type invalide" },
      { status: 400 }
    );
  }

  // Estimation de la taille décodée du base64.
  const approxBytes = Math.floor((file.length * 3) / 4);
  if (approxBytes > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image trop volumineuse (max 5 Mo)" },
      { status: 413 }
    );
  }

  try {
    const record = await replacePhoto(params.id, file, contentType, filename);
    return NextResponse.json({ record });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
