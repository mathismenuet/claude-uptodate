import { NextRequest, NextResponse } from "next/server";
import { assertLocal } from "@/lib/local-guard";
import * as usage from "@/engine/usage.mjs";

export const maxDuration = 300; // premier scan des transcripts (~600 Mo) : quelques secondes à ~1 min

export async function GET(req: NextRequest) {
  const guard = assertLocal(req);
  if (guard) return guard;
  const url = new URL(req.url);
  const data = await usage.readUsage({
    refresh: url.searchParams.get("refresh") === "1",
    name: url.searchParams.get("name") || "",
  });
  return NextResponse.json(data);
}
