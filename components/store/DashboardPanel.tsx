"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Loader2, RefreshCw, TerminalSquare } from "lucide-react";
import { ago, frDay } from "@/lib/format";
import type { LibraryData, UsageData, UsageDrill, UsageKind } from "@/lib/store-types";

// Palette catégorielle validée (dataviz : slots 1-3, ordre fixe, jamais recyclée).
// Les variables --s-skill / --s-mcp / --s-cmd vivent dans globals.css (.cud-viz),
// avec leurs pas dark sélectionnés — pas de flip automatique.
// Relief appliqué (contraste light < 3:1 sur aqua/jaune) : légende + libellés + vue table.
const KIND_META: Record<UsageKind, { label: string; varName: string }> = {
  skill: { label: "Skills", varName: "--s-skill" },
  mcp: { label: "MCP", varName: "--s-mcp" },
  command: { label: "Commandes", varName: "--s-cmd" },
};

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1c1c1e]">
      <p className="text-[12px] font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-neutral-400">{hint}</p>}
    </div>
  );
}

function WeeklyChart({ data }: { data: UsageData }) {
  const [hover, setHover] = useState<number | null>(null);
  const weeks = data.weeks;
  const max = Math.max(1, ...weeks.map((w) => w.skills + w.mcp + w.commands));
  const W = 640, HT = 150, PAD = 4;
  const slot = W / weeks.length;
  const bw = Math.min(26, slot - 8);
  const kinds: UsageKind[] = ["skill", "mcp", "command"]; // ordre fixe des séries
  const val = (w: (typeof weeks)[0], k: UsageKind) => (k === "skill" ? w.skills : k === "mcp" ? w.mcp : w.commands);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${HT + 22}`} className="w-full" role="img" aria-label="Activité par semaine">
        {/* ligne de base */}
        <line x1="0" y1={HT} x2={W} y2={HT} stroke="currentColor" strokeOpacity="0.15" />
        {weeks.map((w, i) => {
          const total = w.skills + w.mcp + w.commands;
          let y = HT;
          const x = i * slot + (slot - bw) / 2;
          return (
            <g key={w.start} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {/* zone de survol plus large que la marque */}
              <rect x={i * slot} y={0} width={slot} height={HT} fill="transparent" />
              {kinds.map((k) => {
                const v = val(w, k);
                if (!v) return null;
                const h = Math.max(2, (v / max) * (HT - PAD));
                y -= h;
                return (
                  <rect key={k} x={x} y={y} width={bw} height={Math.max(1, h - 2)} rx="2"
                    fill={`var(${KIND_META[k].varName})`} />
                );
              })}
              {total > 0 && hover === i && (
                <rect x={x - 2} y={y - 2} width={bw + 4} height={HT - y + 2} fill="none"
                  stroke="currentColor" strokeOpacity="0.3" rx="4" />
              )}
              {(i === 0 || i === weeks.length - 1 || i % 4 === 0) && (
                <text x={i * slot + slot / 2} y={HT + 16} textAnchor="middle"
                  className="fill-neutral-400" fontSize="10">
                  {w.start.slice(5).split("-").reverse().join("/")}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute -top-2 z-10 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/10 dark:bg-[#26262a]"
          style={{ left: `${Math.min(80, (hover / weeks.length) * 100)}%` }}>
          <p className="font-semibold">Semaine du {frDay(weeks[hover].start)}</p>
          {(["skill", "mcp", "command"] as UsageKind[]).map((k) => (
            <p key={k} className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full" style={{ background: `var(${KIND_META[k].varName})` }} />
              {KIND_META[k].label} : <b>{val(weeks[hover], k)}</b>
            </p>
          ))}
        </div>
      )}
      {/* légende — l'identité n'est jamais portée par la couleur seule */}
      <div className="mt-2 flex gap-4 text-xs text-neutral-500">
        {(["skill", "mcp", "command"] as UsageKind[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full" style={{ background: `var(${KIND_META[k].varName})` }} />
            {KIND_META[k].label}
          </span>
        ))}
        <span className="ml-auto">max {max}/sem · 16 dernières semaines</span>
      </div>
    </div>
  );
}

function DrillDown({ name }: { name: string }) {
  const [drill, setDrill] = useState<UsageDrill | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setDrill(null);
    fetch(`/api/usage?name=${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(30000) })
      .then((r) => r.json())
      .then((d) => alive && setDrill(d))
      .catch(() => alive && setDrill({ name, total: 0, events: [] }));
    return () => { alive = false; };
  }, [name]);

  const copyResume = (sessionId: string) => {
    navigator.clipboard.writeText(`claude --resume ${sessionId}`).then(() => {
      setCopied(sessionId);
      setTimeout(() => setCopied(null), 1200);
    });
  };
  const short = (p: string) => (p || "").split("/").slice(-2).join("/");

  if (!drill) return <p className="py-4 text-sm text-neutral-400"><Loader2 className="mr-2 inline size-4 animate-spin" />Chargement des utilisations…</p>;
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-black/5 dark:border-white/10">
      <p className="bg-black/[.03] px-4 py-2 text-xs font-semibold text-neutral-500 dark:bg-white/[.05]">
        {drill.total} utilisation(s) de « {name} » — copie la commande pour ROUVRIR la conversation au bon endroit
      </p>
      <ul className="divide-y divide-black/5 dark:divide-white/[.06]">
        {drill.events.slice(0, 30).map((e, i) => (
          <li key={i} className="flex items-start gap-3 bg-white px-4 py-2.5 text-sm dark:bg-[#1c1c1e]">
            <span className="shrink-0 font-mono text-xs text-neutral-400 tabular-nums">
              {(e.ts || "").slice(0, 16).replace("T", " · ")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-neutral-600 dark:text-neutral-300" title={e.cwd}>
                📁 {short(e.cwd)}
              </p>
              {e.snippet && (
                <p className="truncate text-xs text-neutral-400" title={e.snippet}>« {e.snippet} »</p>
              )}
            </div>
            <button
              onClick={() => copyResume(e.sessionId)}
              title={`Copier : claude --resume ${e.sessionId}`}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-black/[.05] px-2 py-1 font-mono text-[11px] text-neutral-500 transition hover:text-[#0071e3] dark:bg-white/[.07]"
            >
              {copied === e.sessionId ? "✓ copié" : <><TerminalSquare className="size-3" />{e.sessionId.slice(0, 8)}</>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DashboardPanel({ query }: { query: string }) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [lib, setLib] = useState<LibraryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showNeverUsed, setShowNeverUsed] = useState(false);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const [u, l] = await Promise.all([
        fetch(`/api/usage${refresh ? "?refresh=1" : ""}`, { signal: AbortSignal.timeout(120000) }).then((r) => r.json()),
        fetch("/api/library", { signal: AbortSignal.timeout(90000) }).then((r) => r.json()),
      ]);
      setUsage(u);
      setLib(l);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const top = useMemo(() => {
    if (!usage) return [];
    const q = query.toLowerCase();
    return usage.tools.filter((t) => !q || t.name.toLowerCase().includes(q)).slice(0, 15);
  }, [usage, query]);

  const neverUsed = useMemo(() => {
    if (!usage || !lib) return [];
    const used = new Set(usage.tools.map((t) => t.name.toLowerCase()));
    const usedArr = [...used];
    return lib.entries
      .filter((e) => e.container === "user")
      .filter((e) => !used.has(e.name.toLowerCase()) && !usedArr.some((u) => u.endsWith(`:${e.name.toLowerCase()}`)))
      .map((e) => e.name);
  }, [usage, lib]);

  if (loading && !usage) {
    return (
      <div className="grid place-items-center gap-3 rounded-3xl border border-black/5 bg-white py-24 dark:border-white/10 dark:bg-[#161618]">
        <Loader2 className="size-6 animate-spin text-neutral-400" />
        <p className="text-sm text-neutral-500">Analyse de tes transcripts Claude Code…</p>
      </div>
    );
  }
  if (error) return <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!usage) return null;

  const maxCount = Math.max(1, ...top.map((t) => t.count));

  return (
    <div className="cud-viz space-y-6">
      {/* KPIs (stat tiles — pas des graphiques) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Évènements d'outillage" value={usage.totals.events}
          hint={`${usage.totals.skills} skills · ${usage.totals.mcp} MCP · ${usage.totals.commands} commandes`} />
        <Kpi label="Outils distincts utilisés" value={usage.totals.distinct_tools}
          hint={lib ? `sur ${lib.count} possédés` : undefined} />
        <Kpi label="Skills installés jamais invoqués" value={neverUsed.length}
          hint="dossiers « user » sans aucune trace d'usage" />
        <Kpi label="Conversations analysées" value={usage.totals.transcripts}
          hint={`scan ${ago(usage.generated_at)}`} />
      </div>

      {/* Activité hebdo */}
      <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1c1c1e]">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">Activité par semaine</h3>
        <WeeklyChart data={usage} />
      </section>

      {/* Top outils */}
      <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1c1c1e]">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Top outils — clique pour voir quand & dans quelle conversation
        </h3>
        <ul className="space-y-1.5">
          {top.map((t) => (
            <li key={`${t.kind}:${t.name}`}>
              <button
                onClick={() => setSelected(selected === t.name ? null : t.name)}
                className={`flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-black/[.03] dark:hover:bg-white/[.05] ${selected === t.name ? "bg-black/[.04] dark:bg-white/[.06]" : ""}`}
              >
                <span className="w-56 shrink-0 truncate text-[13px] font-medium" title={t.name}>{t.name}</span>
                <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                  style={{ background: `color-mix(in srgb, var(${KIND_META[t.kind].varName}) 14%, transparent)`, color: `var(${KIND_META[t.kind].varName})` }}>
                  {t.kind}
                </span>
                <span className="h-4 min-w-1 flex-1">
                  <span className="block h-4 rounded-r"
                    style={{ width: `${(t.count / maxCount) * 100}%`, background: `var(${KIND_META[t.kind].varName})` }} />
                </span>
                <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums">{t.count}</span>
                <span className="w-20 shrink-0 text-right text-[11px] text-neutral-400">{ago(t.last)}</span>
              </button>
              {selected === t.name && <DrillDown name={t.name} />}
            </li>
          ))}
          {top.length === 0 && <p className="py-6 text-center text-sm text-neutral-400">Aucun outil ne correspond.</p>}
        </ul>
      </section>

      {/* Jamais utilisés */}
      <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1c1c1e]">
        <button onClick={() => setShowNeverUsed(!showNeverUsed)} className="flex w-full items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            💤 Installés mais jamais invoqués ({neverUsed.length})
          </h3>
          <span className="text-xs text-neutral-400">{showNeverUsed ? "replier" : "voir"}</span>
        </button>
        {showNeverUsed && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {neverUsed.slice(0, 80).map((n) => (
              <span key={n} className="rounded-full border border-black/10 px-2.5 py-1 text-[12px] text-neutral-500 dark:border-white/10">{n}</span>
            ))}
            {neverUsed.length > 80 && <span className="text-xs text-neutral-400">… et {neverUsed.length - 80} de plus</span>}
          </div>
        )}
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
        <span>
          Source : ~/.claude/projects (100 % local) · <Copy className="inline size-3" /> ={" "}
          <code>claude --resume &lt;session&gt;</code> rouvre la conversation
        </span>
        <button onClick={() => load(true)} disabled={loading}
          className="flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 font-medium transition hover:border-[#0071e3] hover:text-[#0071e3] disabled:opacity-50 dark:border-white/10">
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Re-scanner
        </button>
      </footer>
    </div>
  );
}
