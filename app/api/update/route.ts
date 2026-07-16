import { NextRequest, NextResponse } from "next/server";
import { assertLocal } from "@/lib/local-guard";
import * as engine from "@/engine/core.mjs";

export const maxDuration = 600;

export async function POST(req: NextRequest) {
  const guard = assertLocal(req);
  if (guard) return guard;
  const body = await req.json().catch(() => ({}));
  const res = await engine.update({ name: body.name || "", all: !!body.all });
  return NextResponse.json(res);
}
