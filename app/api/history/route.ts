import { NextRequest, NextResponse } from "next/server";
import { assertLocal } from "@/lib/local-guard";
import * as engine from "@/engine/core.mjs";

export async function GET(req: NextRequest) {
  const guard = assertLocal(req);
  if (guard) return guard;
  const url = new URL(req.url);
  const events = await engine.readHistory({
    name: url.searchParams.get("name") || "",
    limit: parseInt(url.searchParams.get("limit") || "200", 10),
  });
  return NextResponse.json({ events });
}
