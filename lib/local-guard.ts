import { NextRequest, NextResponse } from "next/server";

// L'app lit le disque et exécute git/gh : on ne sert QUE le trafic localhost.
export function assertLocal(req: NextRequest): NextResponse | null {
  const host = req.headers.get("host") || "";
  if (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host)) return null;
  return NextResponse.json({ error: "Cette API n'est servie qu'en local." }, { status: 403 });
}
