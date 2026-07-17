import { NextRequest, NextResponse } from "next/server";
import { assertLocal } from "@/lib/local-guard";
import * as surfaces from "@/engine/surfaces.mjs";

export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const guard = assertLocal(req);
  if (guard) return guard;
  return NextResponse.json(await surfaces.surfacesReport());
}

export async function POST(req: NextRequest) {
  const guard = assertLocal(req);
  if (guard) return guard;
  const body = await req.json().catch(() => ({}));
  if (body.action !== "sync" || !body.name) {
    return NextResponse.json({ ok: false, log: ["action=sync et name requis"] }, { status: 400 });
  }
  return NextResponse.json(await surfaces.syncDuplicate(body.name));
}
