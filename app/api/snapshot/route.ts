import { NextRequest, NextResponse } from "next/server";
import { assertLocal } from "@/lib/local-guard";
import * as engine from "@/engine/core.mjs";

export async function GET(req: NextRequest) {
  const guard = assertLocal(req);
  if (guard) return guard;
  return NextResponse.json(await engine.snapshot());
}
