"use client";
import { GitBranch, Globe, Package } from "lucide-react";
import type { ToolSource } from "@/lib/store-types";

// Liens "remonter à la source" réutilisables (repo GitHub, site, npm).
export function SourceLinks({ source, compact = false }: { source?: ToolSource | null; compact?: boolean }) {
  if (!source || (!source.repo && !source.homepage && !source.npm)) {
    return compact ? null : <span className="text-[11px] text-neutral-400">source inconnue</span>;
  }
  const cls = compact
    ? "text-neutral-400 transition hover:text-[#0071e3]"
    : "flex items-center gap-1 rounded-full border border-black/10 px-2 py-0.5 text-[11px] font-medium text-neutral-600 transition hover:border-[#0071e3] hover:text-[#0071e3] dark:border-white/15 dark:text-neutral-300";
  return (
    <span className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {source.repo && (
        <a href={source.repo} target="_blank" rel="noreferrer" className={cls} title={source.repo}>
          <GitBranch className="size-3.5" />{!compact && "Repo"}
        </a>
      )}
      {source.homepage && (
        <a href={source.homepage} target="_blank" rel="noreferrer" className={cls} title={source.homepage}>
          <Globe className="size-3.5" />{!compact && "Site"}
        </a>
      )}
      {source.npm && !source.repo && (
        <a href={source.npm} target="_blank" rel="noreferrer" className={cls} title={source.npm}>
          <Package className="size-3.5" />{!compact && "npm"}
        </a>
      )}
    </span>
  );
}
