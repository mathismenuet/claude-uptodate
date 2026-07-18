"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, KeyRound, Loader2, Plug, RefreshCw, Ship } from "lucide-react";
import { ago } from "@/lib/format";
import type { ConnectionsReport, McpEntry, McpStatus } from "@/lib/store-types";
import { CATEGORIES } from "./meta-categories";
import { SourceLinks } from "./SourceLinks";

const STATUS_META: Record<McpStatus, { label: string; cls: string; dot: string }> = {
  connected: { label: "Connecté", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", dot: "🟢" },
  "needs-auth": { label: "Auth requise", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400", dot: "🟠" },
  failed: { label: "Injoignable", cls: "bg-red-500/10 text-red-500", dot: "🔴" },
  installed: { label: "Installée", cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400", dot: "🔵" },
  unknown: { label: "Inconnu", cls: "bg-neutral-500/10 text-neutral-500", dot: "⚪" },
};

const FAMILY_LABEL: Record<McpEntry["family"], string> = {
  user: "MCP perso",
  plugin: "MCP de plugin",
  "claude.ai": "Connecteur claude.ai",
  "desktop-ext": "Extension desktop",
};

function CopyBtn({ value, label }: { value: string; label: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => navigator.clipboard.writeText(value).then(() => { setOk(true); setTimeout(() => setOk(false), 1200); })}
      title={value}
      className="flex items-center gap-1 rounded-full border border-black/10 px-2.5 py-1 text-[11px] font-medium text-neutral-600 transition hover:border-[#0071e3] hover:text-[#0071e3] dark:border-white/15 dark:text-neutral-300"
    >
      {ok ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />} {label}
    </button>
  );
}

export function ConnectionsPanel({ query }: { query: string }) {
  const [report, setReport] = useState<ConnectionsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<McpStatus | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/connections${refresh ? "?refresh=1" : ""}`, {
        signal: AbortSignal.timeout(280000), // claude mcp list fait de vrais health-checks
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setReport(await r.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of report?.mcp || []) c[e.status] = (c[e.status] || 0) + 1;
    return c;
  }, [report]);

  const grouped = useMemo(() => {
    if (!report) return [];
    const q = query.toLowerCase();
    const list = report.mcp
      .filter((e) => !statusFilter || e.status === statusFilter)
      .filter((e) => !q || e.name.toLowerCase().includes(q) || e.family.includes(q));
    const byCat = new Map<string, McpEntry[]>();
    for (const e of list) (byCat.get(e.category) || byCat.set(e.category, []).get(e.category)!).push(e);
    const order = ["connected", "needs-auth", "failed", "installed", "unknown"];
    const catMeta = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
    return [...byCat.entries()]
      .map(([cat, entries]) => ({
        cat,
        label: catMeta[cat] ? `${catMeta[cat].emoji} ${catMeta[cat].label}` : "❓ À classer",
        entries: entries.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => b.entries.length - a.entries.length);
  }, [report, statusFilter, query]);

  if (loading && !report) {
    return (
      <div className="grid place-items-center gap-3 rounded-3xl border border-black/5 bg-white py-24 dark:border-white/10 dark:bg-[#161618]">
        <Loader2 className="size-6 animate-spin text-neutral-400" />
        <p className="text-sm text-neutral-500">Health-check des MCP en cours (claude mcp list)…</p>
      </div>
    );
  }
  if (error) return <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!report) return null;

  return (
    <div className="space-y-6">
      {/* filtres d'état */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Plug className="size-4 text-neutral-400" />
        <button onClick={() => setStatusFilter(null)}
          className={`rounded-full px-3 py-1 text-[12px] font-semibold transition ${!statusFilter ? "bg-neutral-900 text-white dark:bg-white dark:text-black" : "bg-black/[.05] text-neutral-500 dark:bg-white/[.08]"}`}>
          Tous {report.mcp.length}
        </button>
        {(Object.keys(STATUS_META) as McpStatus[]).filter((s) => counts[s]).map((s) => (
          <button key={s} onClick={() => setStatusFilter(statusFilter === s ? null : s)}
            className={`rounded-full px-3 py-1 text-[12px] font-semibold transition ${statusFilter === s ? "bg-neutral-900 text-white dark:bg-white dark:text-black" : "bg-black/[.05] text-neutral-500 dark:bg-white/[.08]"}`}>
            {STATUS_META[s].dot} {STATUS_META[s].label} {counts[s]}
          </button>
        ))}
        {report.health_error && (
          <span className="ml-2 text-[11px] text-amber-500">⚠️ health-check partiel : {report.health_error}</span>
        )}
      </div>

      {/* MCP groupés par catégorie */}
      {grouped.map(({ cat, label, entries }) => (
        <section key={cat} className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1c1c1e]">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">{label} ({entries.length})</h3>
          <ul className="divide-y divide-black/5 dark:divide-white/[.06]">
            {entries.map((e, i) => (
              <li key={`${e.family}:${e.name}:${i}`} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_META[e.status].cls}`}>
                  {STATUS_META[e.status].dot} {STATUS_META[e.status].label}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{e.name}</span>
                    <SourceLinks source={e.source} compact />
                  </span>
                  <span className="block truncate text-[11px] text-neutral-400" title={e.detail}>
                    {FAMILY_LABEL[e.family]}{e.scope && e.scope !== "global" && e.scope !== "claude.ai" && e.scope !== "app Claude" ? ` · ${e.scope.split("/").pop()}` : ""} · {e.transport}
                  </span>
                </span>
                <span className="flex shrink-0 flex-wrap gap-1.5" onClick={(ev) => ev.stopPropagation()}>
                  {e.actions.map((a, j) =>
                    a.kind === "link" ? (
                      <a key={j} href={a.value} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 rounded-full bg-[#0071e3] px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-[#0077ed]">
                        <ExternalLink className="size-3" /> {a.label}
                      </a>
                    ) : a.kind === "command" ? (
                      <CopyBtn key={j} value={a.value} label={a.label} />
                    ) : (
                      <span key={j} className="rounded-full bg-black/[.05] px-2.5 py-1 text-[11px] text-neutral-500 dark:bg-white/[.08]">{a.label}</span>
                    )
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Clés API */}
      <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1c1c1e]">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          <KeyRound className="size-4" /> Clés API ({report.apiKeys.rows.filter((k) => k.defined).length}/{report.apiKeys.rows.length} définies)
        </h3>
        <p className="mb-3 text-[12px] text-neutral-400">Noms uniquement — les valeurs ne sont jamais lues ni affichées.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13px]">
            <tbody className="divide-y divide-black/5 dark:divide-white/[.06] [&_td]:py-2 [&_td]:pr-4">
              {report.apiKeys.rows.map((k) => (
                <tr key={k.env} className={k.defined ? "" : "opacity-60"}>
                  <td className="w-6">{k.defined ? "✅" : "⬜"}</td>
                  <td className="font-mono text-[12px]">{k.env}</td>
                  <td className="font-medium">{k.label}</td>
                  <td className="text-neutral-500">{k.features}</td>
                  <td className="text-[11px] text-neutral-400">{k.defined ? k.where.join(", ") : (
                    <a href={k.url} target="_blank" rel="noreferrer" className="text-[#0071e3] hover:underline">obtenir une clé ↗</a>
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {report.apiKeys.extra.length > 0 && (
          <p className="mt-3 text-[12px] text-neutral-400">
            Autres clés détectées : {report.apiKeys.extra.map((x) => <code key={x} className="mx-0.5">{x}</code>)}
          </p>
        )}
      </section>

      {/* Docker */}
      <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1c1c1e]">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          <Ship className="size-4" /> Stacks locales (Docker)
        </h3>
        {!report.docker.available ? (
          <p className="text-sm text-neutral-400">Docker non détecté ou démon arrêté{report.docker.error ? ` — ${report.docker.error}` : ""}.</p>
        ) : report.docker.projects.length === 0 ? (
          <p className="text-sm text-neutral-400">Aucun conteneur actif.</p>
        ) : (
          <div className="space-y-4">
            {report.docker.projects.map((p) => (
              <div key={p.project} className="rounded-2xl border border-black/5 p-4 dark:border-white/10">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">🐳 {p.project}</p>
                  <CopyBtn value={p.update_hint} label="Copier la commande de MAJ" />
                </div>
                <ul className="space-y-1 text-[13px]">
                  {p.containers.map((c) => (
                    <li key={c.name} className="flex flex-wrap items-center gap-2">
                      <span className={`size-2 rounded-full ${/Up/i.test(c.status) ? "bg-emerald-500" : "bg-red-500"}`} />
                      <span className="font-medium">{c.name}</span>
                      <code className="text-[11px] text-neutral-400">{c.image}</code>
                      <span className="ml-auto text-[11px] text-neutral-400">{c.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="text-[11px] text-neutral-400">
              Les images Docker ne signalent pas leurs MAJ : la commande copiée tire la dernière image puis relance la stack.
            </p>
          </div>
        )}
      </section>

      <footer className="flex items-center justify-between text-xs text-neutral-400">
        <span>État vérifié {ago(report.generated_at)} (cache 30 min)</span>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 font-medium transition hover:border-[#0071e3] hover:text-[#0071e3] disabled:opacity-50 dark:border-white/10">
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Health-check en cours (~1 min)…" : "Re-tester les connexions"}
        </button>
      </footer>
    </div>
  );
}
