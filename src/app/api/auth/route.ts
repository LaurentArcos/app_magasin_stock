import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/auth  -> vérifie le code administrateur
// Corps : { code: string }
export async function POST(req: NextRequest) {
  let body: { code?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code : "";

  if (!process.env.ADMIN_CODE) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_CODE non configuré côté serveur" },
      { status: 500 }
    );
  }

  if (code === process.env.ADMIN_CODE) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false }, { status: 401 });
}
