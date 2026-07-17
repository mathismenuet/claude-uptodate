"use client";
import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { ago } from "@/lib/format";
import type { SurfacesReport } from "@/lib/store-types";

const SURFACE_COLORS: Record<string, string> = {
  claude: "bg-[#0071e3]/10 text-[#0071e3]",
  codex: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  gemini: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

export function SurfacesPanel() {
  const [report, setReport] = useState<SurfacesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/surfaces", { signal: AbortSignal.timeout(60000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setReport(await r.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const sync = useCallback(async (name: string, from: string) => {
    if (!window.confirm(
      `Resynchroniser « ${name} » depuis la copie la plus récente (${from}) vers les autres surfaces ?\n\nLes copies remplacées sont sauvegardées en .bak-<date> à côté.`
    )) return;
    setSyncing(name);
    setLog([]);
    try {
      const r = await fetch("/api/surfaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", name }),
      });
      const j = await r.json();
      setLog(j.log || []);
      await load();
    } catch (e) {
      setLog([String(e)]);
    } finally {
      setSyncing(null);
    }
  }, [load]);

  if (loading && !report) {
    return (
      <div className="grid place-items-center rounded-3xl border border-black/5 bg-white py-24 dark:border-white/10 dark:bg-[#161618]">
        <Loader2 className="size-6 animate-spin text-neutral-400" />
      </div>
    );
  }
  if (error) return <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!report) return null;

  const desync = report.duplicates.filter((d) => !d.identical);

  return (
    <div className="space-y-6">
      {/* Surfaces détectées */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {report.surfaces.map((s) => (
          <div key={s.id}
            className={`rounded-2xl border p-4 shadow-sm ${s.detected ? "border-black/5 bg-white dark:border-white/10 dark:bg-[#1c1c1e]" : "border-dashed border-black/10 bg-transparent opacity-50 dark:border-white/15"}`}>
            <div className="flex items-center justify-between">
              <p className="font-semibold">{s.icon} {s.label}</p>
              {s.detected
                ? <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">présent</span>
                : <span className="rounded-full bg-neutral-500/10 px-2 py-0.5 text-[11px] text-neutral-400">absent</span>}
            </div>
            <p className="mt-1.5 text-[12px] leading-snug text-neutral-500">{s.note}</p>
            {s.detected && s.skills > 0 && (
              <p className="mt-2 text-sm font-medium">{s.skills} skills suivis</p>
            )}
          </div>
        ))}
      </div>

      {/* Doublons inter-surfaces */}
      <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1c1c1e]">
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          ♻️ Doublons inter-surfaces ({report.duplicates.length})
        </h3>
        <p className="mb-4 text-[13px] text-neutral-500">
          Le même skill copié sur plusieurs applis IA. {desync.length > 0
            ? `${desync.length} désynchronisé(s) — les copies n'ont pas le même contenu.`
            : "Toutes les copies sont identiques ✓"}
        </p>
        {log.length > 0 && (
          <div className="mb-4 rounded-xl bg-black/[.04] p-3 font-mono text-xs dark:bg-white/[.06]">
            {log.map((l, i) => <p key={i}>{l}</p>)}
          </div>
        )}
        <ul className="divide-y divide-black/5 dark:divide-white/[.06]">
          {report.duplicates.map((d) => (
            <li key={d.name} className="flex flex-wrap items-center gap-3 py-3">
              <span className="text-lg">{d.identical ? "✅" : "⚠️"}</span>
              <span className="w-52 shrink-0 truncate font-medium">{d.name}</span>
              <span className="flex flex-1 flex-wrap gap-1.5">
                {d.copies.map((c) => (
                  <span key={c.dir} title={`${c.dir}\nhash ${c.hash}\nmodifié ${c.mtime || "?"}`}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${SURFACE_COLORS[c.surface] || "bg-neutral-500/10 text-neutral-500"} ${!d.identical && c.dir === d.newest ? "ring-2 ring-emerald-400/60" : ""}`}>
                    {c.surface}{!d.identical && c.dir === d.newest ? " ★" : ""} <span className="opacity-60 normal-case">{ago(c.mtime)}</span>
                  </span>
                ))}
              </span>
              {!d.identical && (
                <button
                  onClick={() => sync(d.name, d.newest_surface)}
                  disabled={syncing === d.name}
                  className="shrink-0 rounded-full bg-[#0071e3] px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#0077ed] disabled:opacity-60"
                >
                  {syncing === d.name ? <Loader2 className="size-3.5 animate-spin" /> : `Resynchroniser depuis ${d.newest_surface}`}
                </button>
              )}
            </li>
          ))}
          {report.duplicates.length === 0 && (
            <p className="py-8 text-center text-sm text-neutral-400">Aucun doublon entre surfaces.</p>
          )}
        </ul>
        <p className="mt-3 text-[11px] text-neutral-400">
          ★ = copie la plus récente. La resynchronisation copie ★ vers les autres, avec sauvegarde <code>.bak-&lt;date&gt;</code>.
        </p>
      </section>

      <footer className="flex items-center justify-end text-xs text-neutral-400">
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 font-medium transition hover:border-[#0071e3] hover:text-[#0071e3] disabled:opacity-50 dark:border-white/10">
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Re-scanner
        </button>
      </footer>
    </div>
  );
}
