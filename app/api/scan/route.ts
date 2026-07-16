import { NextRequest, NextResponse } from "next/server";
import { assertLocal } from "@/lib/local-guard";
import * as engine from "@/engine/core.mjs";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const guard = assertLocal(req);
  if (guard) return guard;
  const manifest = await engine.scan();
  return NextResponse.json({ manifest });
}
