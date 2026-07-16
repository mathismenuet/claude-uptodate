import { NextRequest, NextResponse } from "next/server";
import { assertLocal } from "@/lib/local-guard";
import * as library from "@/engine/library.mjs";

export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const guard = assertLocal(req);
  if (guard) return guard;
  const url = new URL(req.url);
  const lib = await library.readLibrary({ refresh: url.searchParams.get("refresh") === "1" });
  return NextResponse.json(lib);
}
