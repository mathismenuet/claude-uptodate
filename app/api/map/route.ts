import { NextRequest, NextResponse } from "next/server";
import { assertLocal } from "@/lib/local-guard";
import * as engine from "@/engine/core.mjs";

export async function POST(req: NextRequest) {
  const guard = assertLocal(req);
  if (guard) return guard;
  const body = await req.json().catch(() => ({}));
  if (!body.skill || !body.slug) {
    return NextResponse.json({ ok: false, log: ["skill et slug (owner/repo) requis"] }, { status: 400 });
  }
  const res = await engine.mapSkill({ skill: body.skill, slug: body.slug, path: body.path || "" });
  return NextResponse.json(res);
}
