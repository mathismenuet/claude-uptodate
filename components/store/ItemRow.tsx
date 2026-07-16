"use client";
import { motion } from "framer-motion";
import { AlertTriangle, ChevronRight, Loader2 } from "lucide-react";
import { ago } from "@/lib/format";
import type { ItemState, ManifestItem } from "@/lib/store-types";
import { TYPE_META, rowKind } from "./meta";

export function ItemRow({
  item,
  st,
  updating,
  onOpen,
  onUpdate,
}: {
  item: ManifestItem;
  st?: ItemState;
  updating: boolean;
  onOpen: () => void;
  onUpdate: () => void;
}) {
  const meta = TYPE_META[item.type];
  const kind = rowKind(item, st);
  const behind = st?.behind || 0;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex cursor-pointer items-center gap-4 px-4 py-3.5 transition-colors hover:bg-black/[.03] dark:hover:bg-white/[.04]"
      onClick={onOpen}
    >
      {/* icône façon App Store */}
      <div className={`relative grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${meta.tile} shadow-sm`}>
        <meta.Icon className="size-7 text-white" strokeWidth={1.8} />
        {behind > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white shadow">
            {behind > 99 ? "99+" : behind}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold leading-tight">{item.name}</p>
        <p className="truncate text-[13px] text-neutral-500 dark:text-neutral-400">
          {meta.label}
          {item.slug ? ` · ${item.slug}` : ""}
          {st?.remote_date ? ` · upstream ${ago(st.remote_date)}` : ""}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {kind === "update" && (
          <button
            onClick={onUpdate}
            disabled={updating}
            className="rounded-full bg-[#0071e3] px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#0077ed] active:scale-95 disabled:opacity-60"
          >
            {updating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "METTRE À JOUR"
            )}
          </button>
        )}
        {kind === "manual" && (
          <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1.5 text-[12px] font-semibold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-3.5" /> MANUEL
          </span>
        )}
        {kind === "reinstall" && (
          <span className="rounded-full bg-indigo-500/15 px-3 py-1.5 text-[12px] font-semibold text-indigo-600 dark:text-indigo-400">
            MAJ DISPO
          </span>
        )}
        {kind === "uptodate" && (
          <span className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-neutral-400">
            À JOUR ✓
          </span>
        )}
        {kind === "modified" && (
          <span className="rounded-full bg-neutral-500/10 px-3 py-1.5 text-[12px] font-semibold text-neutral-500 dark:text-neutral-400">
            MODIFIÉ ✏️
          </span>
        )}
        {kind === "baseline" && (
          <span className="rounded-full bg-sky-500/10 px-3 py-1.5 text-[12px] font-semibold text-sky-600 dark:text-sky-400">
            BASELINE 📍
          </span>
        )}
        {kind === "error" && (
          <span className="rounded-full bg-red-500/10 px-3 py-1.5 text-[12px] font-semibold text-red-500">
            ERREUR
          </span>
        )}
        {kind === "unknown" && (
          <span className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-neutral-400">
            —
          </span>
        )}
        <ChevronRight className="size-4 text-neutral-300 transition group-hover:text-neutral-400 dark:text-neutral-600" />
      </div>
    </motion.li>
  );
}
