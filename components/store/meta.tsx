"use client";
import { FolderGit2, Sparkles, Store, Wand2, PackageSearch } from "lucide-react";
import type { ItemState, ItemType, ManifestItem } from "@/lib/store-types";

export const TYPE_META: Record<
  ItemType,
  { label: string; Icon: typeof FolderGit2; tile: string }
> = {
  repo: { label: "Repo cloné", Icon: FolderGit2, tile: "from-sky-400 to-blue-600" },
  "skill-git": { label: "Skill (git)", Icon: Sparkles, tile: "from-violet-400 to-purple-600" },
  "skill-cli": { label: "Skill (CLI)", Icon: Wand2, tile: "from-fuchsia-400 to-pink-600" },
  "skill-mapped": { label: "Skill (mappé)", Icon: PackageSearch, tile: "from-indigo-400 to-violet-600" },
  marketplace: { label: "Marketplace plugins", Icon: Store, tile: "from-amber-400 to-orange-600" },
};

export type RowKind =
  | "update" // MAJ dispo, applicable sans risque
  | "manual" // MAJ dispo mais modifs locales → à la main
  | "reinstall" // skill mappé : MAJ upstream, réinstallation manuelle
  | "uptodate"
  | "modified" // à jour mais modifié localement
  | "baseline"
  | "error"
  | "unknown";

export function rowKind(item: ManifestItem, st?: ItemState): RowKind {
  if (!st) return "unknown";
  if (st.status === "error") return "error";
  if (st.status === "baseline") return "baseline";
  if (st.status === "behind") return st.dirty || st.ahead ? "manual" : "update";
  if (st.status === "update_available")
    return item.type === "skill-cli" ? "update" : "reinstall";
  if (st.status === "ok") return st.dirty || st.ahead ? "modified" : "uptodate";
  return "unknown";
}

export function isSafeUpdatable(item: ManifestItem, st?: ItemState): boolean {
  return rowKind(item, st) === "update";
}
