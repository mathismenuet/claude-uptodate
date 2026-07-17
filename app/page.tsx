"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { DownloadCloud, Loader2, Radar, RefreshCw, Search } from "lucide-react";
import { frDateTime } from "@/lib/format";
import type { ItemState, ManifestItem, Snapshot } from "@/lib/store-types";
import { ItemRow } from "@/components/store/ItemRow";
import { DetailPanel } from "@/components/store/DetailPanel";
import { OrphansPanel } from "@/components/store/OrphansPanel";
import { LibraryPanel } from "@/components/store/LibraryPanel";
import { DashboardPanel } from "@/components/store/DashboardPanel";
import { SurfacesPanel } from "@/components/store/SurfacesPanel";
import { LegendPanel } from "@/components/store/LegendPanel";
import { ConnectionsPanel } from "@/components/store/ConnectionsPanel";
import { isSafeUpdatable, rowKind } from "@/components/store/meta";

type Tab = "all" | "repos" | "skills" | "plugins" | "orphans" | "library" | "dashboard" | "surfaces" | "connections" | "legend";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "Tout" },
  { id: "repos", label: "Repos" },
  { id: "skills", label: "Skills" },
  { id: "plugins", label: "Plugins" },
  { id: "orphans", label: "Sans source" },
  { id: "library", label: "📚 Bibliothèque" },
  { id: "dashboard", label: "📊 Dashboard" },
  { id: "surfaces", label: "🗺 Surfaces" },
  { id: "connections", label: "🔌 Connexions" },
  { id: "legend", label: "❔ Légende" },
];

const KIND_ORDER: Record<string, number> = {
  update: 0, manual: 1, reinstall: 2, modified: 3, error: 4, baseline: 5, uptodate: 6, unknown: 7,
};

export default function Home() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [updatingAll, setUpdatingAll] = useState(false);
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const [updateLogs, setUpdateLogs] = useState<Record<string, string[]>>({});
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = useCallback(async () => {
    try {
      // Convention template : tout chargement initial converge (timeout 12 s, jamais de spinner infini)
      const r = await fetch("/api/snapshot", { signal: AbortSignal.timeout(12000) });
      setSnap(await r.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSnapshot(); }, [loadSnapshot]);

  // rescan=true par défaut : « Vérifier » découvre AUSSI les nouveaux clones/skills
  const runCheck = useCallback(async (withFetch = true, rescan = true) => {
    setChecking(true);
    setError(null);
    try {
      const r = await fetch(`/api/check?fetch=${withFetch ? 1 : 0}&rescan=${rescan ? 1 : 0}`, { method: "POST" });
      if (!r.ok) throw new Error(`check → HTTP ${r.status}`);
      const j = await r.json();
      setSnap((s) => (s ? { ...s, manifest: j.manifest, state: j.state } : s));
    } catch (e) {
      setError(String(e));
    } finally {
      setChecking(false);
    }
  }, []);

  const runUpdate = useCallback(async (name: string, key: string) => {
    setUpdating((s) => new Set(s).add(key));
    try {
      const r = await fetch("/api/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const j = await r.json();
      // le résultat s'affiche AUSSI dans le bandeau visible (pas seulement le panneau détail)
      setUpdateLogs((l) => ({ ...l, [key]: j.log || [], __all__: j.log || [] }));
      await runCheck(false); // recalcul rapide sans re-fetch réseau
    } catch (e) {
      setUpdateLogs((l) => ({ ...l, [key]: [String(e)] }));
    } finally {
      setUpdating((s) => { const n = new Set(s); n.delete(key); return n; });
    }
  }, [runCheck]);

  const runUpdateAll = useCallback(async () => {
    setUpdatingAll(true);
    try {
      const r = await fetch("/api/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const j = await r.json();
      setUpdateLogs((l) => ({ ...l, __all__: j.log || [] }));
      await runCheck(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setUpdatingAll(false);
    }
  }, [runCheck]);

  const items = useMemo(() => snap?.manifest?.items || [], [snap]);
  const stateItems = useMemo(() => snap?.state?.items || {}, [snap]);
  const orphans = useMemo(() => snap?.manifest?.orphans || [], [snap]);

  const stOf = useCallback((it: ManifestItem): ItemState | undefined => stateItems[it.key], [stateItems]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items
      .filter((it) => {
        if (tab === "repos") return it.type === "repo";
        if (tab === "skills") return it.type.startsWith("skill-");
        if (tab === "plugins") return it.type === "marketplace";
        return true;
      })
      .filter((it) => !q || it.name.toLowerCase().includes(q) || (it.slug || "").toLowerCase().includes(q))
      .sort((a, b) => {
        const ka = KIND_ORDER[rowKind(a, stOf(a))] ?? 9;
        const kb = KIND_ORDER[rowKind(b, stOf(b))] ?? 9;
        if (ka !== kb) return ka - kb;
        return (stOf(b)?.behind || 0) - (stOf(a)?.behind || 0) || a.name.localeCompare(b.name);
      });
  }, [items, tab, query, stOf]);

  const safeCount = useMemo(
    () => items.filter((it) => isSafeUpdatable(it, stOf(it))).length,
    [items, stOf]
  );
  const attention = useMemo(
    () => items.filter((it) => ["update", "manual", "reinstall"].includes(rowKind(it, stOf(it)))).length,
    [items, stOf]
  );

  const counts: Record<Tab, number> = useMemo(() => ({
    all: items.length,
    repos: items.filter((i) => i.type === "repo").length,
    skills: items.filter((i) => i.type.startsWith("skill-")).length,
    plugins: items.filter((i) => i.type === "marketplace").length,
    orphans: orphans.length,
    library: -1, // le compte vit dans l'onglet lui-même
    dashboard: -1,
    surfaces: -1,
    connections: -1,
    legend: -1,
  }), [items, orphans]);

  const selected = selectedKey ? items.find((i) => i.key === selectedKey) || null : null;

  return (
    <div className="min-h-screen pb-24">
      {/* barre supérieure */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#f5f5f7]/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#0b0b0d]/80">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-5 py-3">
          <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#0a84ff] to-[#0055d4] shadow-sm">
            <Radar className="size-5 text-white" />
          </div>
          <span className="text-[15px] font-bold tracking-tight">Claude UpToDate</span>
          <div className="relative ml-auto w-full max-w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher"
              className="w-full rounded-full border border-black/10 bg-white/70 py-1.5 pl-9 pr-3 text-sm outline-none transition focus:border-[#0071e3] dark:border-white/10 dark:bg-white/[.06]"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5">
        {/* héro façon page "Mises à jour" */}
        <section className="flex flex-wrap items-end justify-between gap-4 pb-5 pt-8">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">Mises à jour</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {snap?.state?.checked_at
                ? <>Dernière vérification : {frDateTime(snap.state.checked_at)}</>
                : "Jamais vérifié — lance un premier check"}
              {attention > 0 && (
                <span className="ml-2 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-500">
                  {attention} à traiter
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => runCheck(true)}
              disabled={checking}
              className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-[#0071e3] hover:text-[#0071e3] disabled:opacity-60 dark:border-white/10 dark:bg-white/[.06] dark:text-neutral-200"
            >
              <RefreshCw className={`size-4 ${checking ? "animate-spin" : ""}`} />
              {checking ? "Vérification…" : "Vérifier"}
            </button>
            {safeCount > 0 && (
              <button
                onClick={runUpdateAll}
                disabled={updatingAll || checking}
                className="flex items-center gap-2 rounded-full bg-[#0071e3] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0077ed] disabled:opacity-60"
              >
                {updatingAll ? <Loader2 className="size-4 animate-spin" /> : <DownloadCloud className="size-4" />}
                Tout mettre à jour ({safeCount})
              </button>
            )}
          </div>
        </section>

        {error && (
          <p className="mb-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {updateLogs.__all__ && (
          <div className="mb-4 rounded-2xl bg-black/[.04] p-4 font-mono text-xs leading-relaxed dark:bg-white/[.06]">
            {updateLogs.__all__.map((l, i) => <p key={i}>{l}</p>)}
          </div>
        )}

        {/* onglets segmentés */}
        <nav className="mb-5 flex w-fit gap-1 rounded-full bg-black/[.05] p-1 dark:bg-white/[.08]">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition ${
                tab === t.id
                  ? "bg-white text-neutral-900 shadow-sm dark:bg-[#2c2c2e] dark:text-white"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              {t.label}
              {counts[t.id] >= 0 && (
                <span className="ml-1.5 text-[11px] font-medium text-neutral-400">{counts[t.id]}</span>
              )}
            </button>
          ))}
        </nav>

        {/* contenu */}
        {loading ? (
          <div className="grid place-items-center rounded-3xl border border-black/5 bg-white py-24 dark:border-white/10 dark:bg-[#161618]">
            <Loader2 className="size-6 animate-spin text-neutral-400" />
          </div>
        ) : tab === "library" ? (
          <LibraryPanel query={query} />
        ) : tab === "dashboard" ? (
          <DashboardPanel query={query} />
        ) : tab === "surfaces" ? (
          <SurfacesPanel />
        ) : tab === "connections" ? (
          <ConnectionsPanel query={query} />
        ) : tab === "legend" ? (
          <LegendPanel />
        ) : tab === "orphans" ? (
          <OrphansPanel orphans={orphans} query={query} onMapped={loadSnapshot} />
        ) : !snap?.state ? (
          <div className="grid place-items-center gap-4 rounded-3xl border border-black/5 bg-white py-20 text-center dark:border-white/10 dark:bg-[#161618]">
            <Radar className="size-10 text-[#0071e3]" />
            <div>
              <p className="font-semibold">Bienvenue dans ton App Store local</p>
              <p className="mt-1 max-w-sm text-sm text-neutral-500">
                {items.length
                  ? `${items.length} éléments inventoriés. Lance la première vérification pour connaître leur état.`
                  : "Lance la première vérification : inventaire + état de chaque repo, skill et plugin."}
              </p>
            </div>
            <button
              onClick={() => runCheck(true, true)}
              disabled={checking}
              className="flex items-center gap-2 rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0077ed] disabled:opacity-60"
            >
              {checking ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              {checking ? "Vérification en cours…" : "Premier check"}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="rounded-3xl border border-black/5 bg-white py-16 text-center text-sm text-neutral-400 dark:border-white/10 dark:bg-[#161618]">
            Rien ici{query ? ` pour « ${query} »` : ""}.
          </p>
        ) : (
          <ul className="divide-y divide-black/5 overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm dark:divide-white/[.06] dark:border-white/10 dark:bg-[#161618]">
            {filtered.map((it) => (
              <ItemRow
                key={it.key}
                item={it}
                st={stOf(it)}
                updating={updating.has(it.key) || updatingAll}
                onOpen={() => setSelectedKey(it.key)}
                onUpdate={() => runUpdate(it.name, it.key)}
              />
            ))}
          </ul>
        )}

        {/* 🍺 Homebrew — installations hors git (apps/CLI) détectées en retard au check */}
        {tab === "all" && !loading && (snap?.state?.brew?.length || 0) > 0 && (
          <section className="mt-6">
            <h3 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-neutral-400">
              🍺 Homebrew en retard ({snap!.state!.brew!.length})
            </h3>
            <ul className="divide-y divide-black/5 overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm dark:divide-white/[.06] dark:border-white/10 dark:bg-[#161618]">
              {snap!.state!.brew!.map((b) => (
                <li key={b.name} className="flex items-center gap-4 px-4 py-3">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 text-xl shadow-sm">
                    🍺
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold leading-tight">{b.name}{b.cask ? " (app)" : ""}</p>
                    <p className="truncate text-[13px] text-neutral-500">{b.installed || "?"} → {b.latest || "?"}</p>
                  </div>
                  <button
                    onClick={() => runUpdate(b.name, `brew:${b.name}`)}
                    disabled={updating.has(`brew:${b.name}`)}
                    className="shrink-0 rounded-full bg-[#0071e3] px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#0077ed] active:scale-95 disabled:opacity-60"
                  >
                    {updating.has(`brew:${b.name}`) ? <Loader2 className="size-4 animate-spin" /> : "METTRE À JOUR"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
          <span>
            Données : <code className="font-mono">{snap?.data_dir || "~/.claude/repo-radar"}</code>
          </span>
          <a
            href="https://github.com/mathismenuet/claude-uptodate"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#0071e3]"
          >
            claude-uptodate v0.4.1 — open source
          </a>
        </footer>
      </main>

      <AnimatePresence>
        {selected && (
          <DetailPanel
            key={selected.key}
            item={selected}
            st={stOf(selected)}
            updating={updating.has(selected.key) || updatingAll}
            updateLog={updateLogs[selected.key] || []}
            onClose={() => setSelectedKey(null)}
            onUpdate={() => runUpdate(selected.name, selected.key)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
