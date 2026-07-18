"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Check, Copy, Loader2, RefreshCw, ShoppingBasket, X } from "lucide-react";
import { ago } from "@/lib/format";
import type { LibraryBasket, LibraryData, LibraryEntry, UsageData } from "@/lib/store-types";
import { SourceLinks } from "./SourceLinks";

type SortMode = "az" | "recent" | "oldest" | "used";
const SORTS: { id: SortMode; label: string }[] = [
  { id: "az", label: "Nom A→Z" },
  { id: "recent", label: "Installé récemment" },
  { id: "oldest", label: "Installé anciennement" },
  { id: "used", label: "Les plus utilisés" },
];

const SURFACE_BADGE: Record<string, string> = {
  claude: "bg-[#0071e3]/10 text-[#0071e3]",
  codex: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  gemini: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

function containerLabel(c: string) {
  return c === "user" ? "installé" : c.replace("marketplace:", "🏬 ");
}

function buildBrief(lib: LibraryData, basket: LibraryBasket): string {
  const byId = Object.fromEntries(lib.entries.map((e) => [e.id, e]));
  const L = [`# 🧺 Brief d'outillage — ${basket.label}`, "", "Pour cette mission, pense à utiliser ces outils installés :", ""];
  for (const id of basket.items) {
    const e = byId[id];
    if (e) L.push(`- **${e.name}** (\`${e.invocation}\`, ${e.surface}) — ${e.when || e.description}`);
  }
  L.push("", "_Généré par Claude UpToDate._");
  return L.join("\n");
}

function EntryCard({ e, used }: { e: LibraryEntry; used: number }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(e.invocation).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }, [e.invocation]);
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-black/5 bg-white p-3.5 shadow-sm transition hover:shadow dark:border-white/10 dark:bg-[#1c1c1e]">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[14px] font-semibold" title={e.name}>{e.name}</p>
        <span className="flex shrink-0 items-center gap-1">
          {used > 0 && (
            <span className="rounded-full bg-[#0071e3]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#0071e3]" title={`${used} utilisation(s) détectée(s)`}>
              {used}×
            </span>
          )}
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${SURFACE_BADGE[e.surface] || "bg-neutral-500/10 text-neutral-500"}`}>
            {e.surface}
          </span>
        </span>
      </div>
      <p className="line-clamp-2 min-h-8 text-[12px] leading-snug text-neutral-500 dark:text-neutral-400" title={e.when || e.description}>
        {e.when || e.description || "—"}
      </p>
      <div className="mt-auto flex items-center justify-between gap-2">
        <button
          onClick={copy}
          title="Copier l'invocation"
          className="flex min-w-0 items-center gap-1 rounded-lg bg-black/[.05] px-2 py-1 font-mono text-[11px] text-neutral-600 transition hover:bg-[#0071e3]/10 hover:text-[#0071e3] dark:bg-white/[.07] dark:text-neutral-300"
        >
          {copied ? <Check className="size-3 shrink-0 text-emerald-500" /> : <Copy className="size-3 shrink-0" />}
          <span className="truncate">{e.invocation}</span>
        </button>
        <span className="shrink-0 text-right text-[10px] leading-tight text-neutral-400" title={e.container}>
          {containerLabel(e.container)}
          {e.installed_at && <><br />⤓ {ago(e.installed_at)}</>}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-black/5 pt-2 dark:border-white/10">
        <SourceLinks source={e.source} />
      </div>
    </div>
  );
}

export function LibraryPanel({ query }: { query: string }) {
  const [lib, setLib] = useState<LibraryData | null>(null);
  const [usedBy, setUsedBy] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cat, setCat] = useState<string | null>(null);
  const [basketId, setBasketId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>("az");
  const [briefCopied, setBriefCopied] = useState(false);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/library${refresh ? "?refresh=1" : ""}`, {
        signal: AbortSignal.timeout(90000), // premier scan ≈ quelques secondes, marge large
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setLib(await r.json());
      // compteurs d'usage (pour le tri « plus utilisés » et le badge N×)
      fetch("/api/usage", { signal: AbortSignal.timeout(120000) })
        .then((u) => u.json())
        .then((u: UsageData) => {
          const m: Record<string, number> = {};
          for (const t of u.tools || []) {
            const key = t.name.toLowerCase();
            m[key] = (m[key] || 0) + t.count;
            const tail = key.split(":").pop();
            if (tail && tail !== key) m[tail] = (m[tail] || 0) + t.count;
          }
          setUsedBy(m);
        })
        .catch(() => {});
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const usedCount = useCallback((e: LibraryEntry) => usedBy[e.name.toLowerCase()] || 0, [usedBy]);

  const basket = useMemo(
    () => (basketId && lib ? lib.baskets.find((b) => b.id === basketId) || null : null),
    [basketId, lib]
  );

  const filtered = useMemo(() => {
    if (!lib) return [];
    const q = query.toLowerCase();
    let list = lib.entries;
    if (basket) {
      const ids = new Set(basket.items);
      list = list.filter((e) => ids.has(e.id));
    } else if (cat) {
      list = list.filter((e) => e.category === cat);
    }
    if (q) {
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.when.toLowerCase().includes(q) ||
          e.container.toLowerCase().includes(q)
      );
    }
    const byDate = (x: LibraryEntry) => x.installed_at || "";
    return [...list].sort((a, b) => {
      if (sort === "recent") return byDate(b).localeCompare(byDate(a)) || a.name.localeCompare(b.name);
      if (sort === "oldest") return byDate(a).localeCompare(byDate(b)) || a.name.localeCompare(b.name);
      if (sort === "used") return usedCount(b) - usedCount(a) || a.name.localeCompare(b.name);
      // az : curated d'abord, puis alpha
      return Number(b.curated) - Number(a.curated) || a.name.localeCompare(b.name);
    });
  }, [lib, cat, basket, query, sort, usedCount]);

  const copyBrief = useCallback(() => {
    if (!lib || !basket) return;
    navigator.clipboard.writeText(buildBrief(lib, basket)).then(() => {
      setBriefCopied(true);
      setTimeout(() => setBriefCopied(false), 1500);
    });
  }, [lib, basket]);

  if (loading && !lib) {
    return (
      <div className="grid place-items-center gap-3 rounded-3xl border border-black/5 bg-white py-24 dark:border-white/10 dark:bg-[#161618]">
        <Loader2 className="size-6 animate-spin text-neutral-400" />
        <p className="text-sm text-neutral-500">Scan de toute ta bibliothèque d&apos;outils…</p>
      </div>
    );
  }
  if (error) {
    return <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</p>;
  }
  if (!lib) return null;

  return (
    <div className="space-y-5">
      {/* Paniers de mission */}
      <div className="flex flex-wrap items-center gap-2">
        <ShoppingBasket className="size-4 text-neutral-400" />
        {lib.baskets.map((b) => (
          <button
            key={b.id}
            onClick={() => { setBasketId(basketId === b.id ? null : b.id); setCat(null); }}
            className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition ${
              basketId === b.id
                ? "border-[#0071e3] bg-[#0071e3] text-white"
                : "border-black/10 bg-white text-neutral-600 hover:border-[#0071e3] hover:text-[#0071e3] dark:border-white/10 dark:bg-[#1c1c1e] dark:text-neutral-300"
            }`}
          >
            {b.emoji} {b.label} <span className="opacity-60">{b.items.length}</span>
          </button>
        ))}
      </div>

      {/* Bandeau panier actif */}
      {basket && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#0071e3]/30 bg-[#0071e3]/5 px-4 py-3">
          <p className="text-sm">
            <span className="font-semibold">{basket.emoji} {basket.label}</span>
            <span className="text-neutral-500"> — {basket.items.length} outils dans le panier</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={copyBrief}
              className="flex items-center gap-1.5 rounded-full bg-[#0071e3] px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#0077ed]"
            >
              {briefCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {briefCopied ? "Copié !" : "Copier le brief pour Claude"}
            </button>
            <button
              onClick={() => setBasketId(null)}
              className="grid size-7 place-items-center rounded-full bg-black/5 text-neutral-500 hover:bg-black/10 dark:bg-white/10"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Tri */}
      <div className="flex items-center gap-1.5">
        <ArrowUpDown className="size-4 text-neutral-400" />
        {SORTS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSort(s.id)}
            className={`rounded-full px-3 py-1 text-[12px] font-semibold transition ${
              sort === s.id ? "bg-neutral-900 text-white dark:bg-white dark:text-black" : "bg-black/[.05] text-neutral-500 hover:text-neutral-800 dark:bg-white/[.08] dark:hover:text-neutral-200"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Catégories */}
      {!basket && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCat(null)}
            className={`rounded-full px-3 py-1 text-[12px] font-semibold transition ${!cat ? "bg-neutral-900 text-white dark:bg-white dark:text-black" : "bg-black/[.05] text-neutral-500 hover:text-neutral-800 dark:bg-white/[.08] dark:hover:text-neutral-200"}`}
          >
            Tout {lib.count}
          </button>
          {lib.categories.filter((c) => c.count > 0).map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(cat === c.id ? null : c.id)}
              className={`rounded-full px-3 py-1 text-[12px] font-semibold transition ${
                cat === c.id ? "bg-neutral-900 text-white dark:bg-white dark:text-black" : "bg-black/[.05] text-neutral-500 hover:text-neutral-800 dark:bg-white/[.08] dark:hover:text-neutral-200"
              }`}
            >
              {c.emoji} {c.label} <span className="opacity-60">{c.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Grille */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, 240).map((e) => <EntryCard key={e.id} e={e} used={usedCount(e)} />)}
      </div>
      {filtered.length > 240 && (
        <p className="text-center text-xs text-neutral-400">
          {filtered.length - 240} de plus — affine avec la recherche ou une catégorie.
        </p>
      )}
      {filtered.length === 0 && (
        <p className="rounded-3xl border border-black/5 bg-white py-14 text-center text-sm text-neutral-400 dark:border-white/10 dark:bg-[#161618]">
          Aucun outil ne correspond.
        </p>
      )}

      <footer className="flex items-center justify-between text-xs text-neutral-400">
        <span>{lib.count} outils · scanné {ago(lib.generated_at)}</span>
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 font-medium transition hover:border-[#0071e3] hover:text-[#0071e3] disabled:opacity-50 dark:border-white/10"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Re-scanner
        </button>
      </footer>
    </div>
  );
}
