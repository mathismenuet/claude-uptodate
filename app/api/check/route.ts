import { NextRequest, NextResponse } from "next/server";
import { assertLocal } from "@/lib/local-guard";
import * as engine from "@/engine/core.mjs";

// Un check complet fait des `git fetch` + appels API GitHub : ça peut prendre ~1 min.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const guard = assertLocal(req);
  if (guard) return guard;
  const url = new URL(req.url);
  const noFetch = url.searchParams.get("fetch") === "0";
  const rescan = url.searchParams.get("rescan") === "1";
  const { manifest, state } = await engine.check({ fetch: !noFetch, rescan });
  return NextResponse.json({ manifest, state });
}
