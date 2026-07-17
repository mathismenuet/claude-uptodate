import { NextRequest, NextResponse } from "next/server";
import { assertLocal } from "@/lib/local-guard";
import * as connections from "@/engine/connections.mjs";

// claude mcp list fait de vrais health-checks réseau → jusqu'à ~2 min
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const guard = assertLocal(req);
  if (guard) return guard;
  const url = new URL(req.url);
  const report = await connections.connectionsReport({
    refresh: url.searchParams.get("refresh") === "1",
  });
  return NextResponse.json(report);
}
