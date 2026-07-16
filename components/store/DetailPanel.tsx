"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, ExternalLink, GitCommitHorizontal, Gift, History as HistoryIcon,
  Loader2, X,
} from "lucide-react";
import { ago, frDay } from "@/lib/format";
import type { HistoryEvent, ItemState, ManifestItem } from "@/lib/store-types";
import { TYPE_META, rowKind } from "./meta";

export function DetailPanel({
  item,
  st,
  updating,
  updateLog,
  onClose,
  onUpdate,
}: {
  item: ManifestItem;
  st?: ItemState;
  updating: boolean;
  updateLog: string[];
  onClose: () => void;
  onUpdate: () => void;
}) {
  const meta = TYPE_META[item.type];
  const kind = rowKind(item, st);
  const [events, setEvents] = useState<HistoryEvent[] | null>(null);

  useEffect(() => {
    let alive = true;
    setEvents(null);
    fetch(`/api/history?name=${encodeURIComponent(item.name)}&limit=30`)
      .then((r) => r.json())
      .then((j) => alive && setEvents((j.events || []).reverse()))
      .catch(() => alive && setEvents([]));
    return () => { alive = false; };
  }, [item.name]);

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl dark:bg-[#161618]"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        {/* header */}
        <div className="sticky top-0 z-10 border-b border-black/5 bg-white/80 px-6 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#161618]/80">
          <div className="flex items-center gap-4">
            <div className={`grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${meta.tile} shadow`}>
              <meta.Icon className="size-8 text-white" strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold">{item.name}</h2>
              <p className="truncate text-sm text-neutral-500">{meta.label}{item.slug ? ` · ${item.slug}` : ""}</p>
            </div>
            <button
              onClick={onClose}
              className="grid size-8 shrink-0 place-items-center rounded-full bg-black/5 text-neutral-500 transition hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {kind === "update" && (
              <button
                onClick={onUpdate}
                disabled={updating}
                className="flex items-center gap-2 rounded-full bg-[#0071e3] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#0077ed] disabled:opacity-60"
              >
                {updating && <Loader2 className="size-4 animate-spin" />}
                {updating ? "Mise à jour…" : `Mettre à jour${st?.behind ? ` (${st.behind})` : ""}`}
              </button>
            )}
            {kind === "manual" && (
              <span className="flex items-center gap-2 rounded-full bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-4" />
                Modifs locales — mise à jour manuelle (stash/commit puis pull)
              </span>
            )}
            {kind === "reinstall" && (
              <span className="rounded-full bg-indigo-500/15 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                MAJ upstream — réinstaller depuis la source
              </span>
            )}
            {kind === "uptodate" && (
              <span className="rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                ✓ À jour {st?.remote_date ? `· upstream ${ago(st.remote_date)}` : ""}
              </span>
            )}
            {kind === "modified" && (
              <span className="rounded-full bg-neutral-500/10 px-4 py-2 text-sm font-medium text-neutral-500 dark:text-neutral-300">
                ✏️ À jour, modifié localement
                {st?.ahead ? ` · ${st.ahead} commit(s) local(aux)` : ""}{st?.dirty ? " · non commité" : ""}
              </span>
            )}
            {kind === "error" && (
              <span className="rounded-full bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500">
                {st?.error || st?.fetch_error || "erreur"}
              </span>
            )}
            {item.slug && (
              <a
                href={`https://github.com/${item.slug}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:border-[#0071e3] hover:text-[#0071e3] dark:border-white/15 dark:text-neutral-300"
              >
                GitHub <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
        </div>

        <div className="space-y-6 px-6 py-5">
          {updateLog.length > 0 && (
            <section className="rounded-2xl bg-black/[.04] p-4 font-mono text-xs leading-relaxed dark:bg-white/[.06]">
              {updateLog.map((l, i) => <p key={i}>{l}</p>)}
            </section>
          )}

          {item.path && (
            <p className="break-all rounded-xl bg-black/[.04] px-3 py-2 font-mono text-xs text-neutral-500 dark:bg-white/[.06] dark:text-neutral-400">
              {item.path}
            </p>
          )}

          {st?.release && (
            <section>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
                <Gift className="size-4" /> Dernière release
              </h3>
              <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1c1c1e]">
                <p className="font-semibold">{st.release.tag}</p>
                {st.release.name && !st.release.name.toLowerCase().startsWith(st.release.tag.toLowerCase()) && (
                  <p className="text-sm text-neutral-500">{st.release.name}</p>
                )}
                <p className="mt-1 text-xs text-neutral-400">{ago(st.release.date)}</p>
              </div>
            </section>
          )}

          {(st?.new_commits?.length || 0) > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
                <GitCommitHorizontal className="size-4" /> Nouveautés upstream ({st?.behind})
              </h3>
              <ul className="space-y-1.5 rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1c1c1e]">
                {st!.new_commits!.map((c) => (
                  <li key={c.sha} className="flex gap-3 text-sm">
                    <code className="shrink-0 text-xs text-[#0071e3]">{c.sha}</code>
                    <span className="min-w-0 flex-1 truncate text-neutral-700 dark:text-neutral-200" title={c.subject}>
                      {c.subject}
                    </span>
                    <span className="shrink-0 text-xs text-neutral-400">{c.date}</span>
                  </li>
                ))}
                {(st?.behind || 0) > (st?.new_commits?.length || 0) && (
                  <li className="text-xs text-neutral-400">
                    … et {(st!.behind || 0) - st!.new_commits!.length} autre(s)
                  </li>
                )}
              </ul>
            </section>
          )}

          {st?.last_subject && st.status === "update_available" && (
            <section className="rounded-2xl border border-black/5 bg-white p-4 text-sm shadow-sm dark:border-white/10 dark:bg-[#1c1c1e]">
              <p className="text-neutral-500">Dernier commit upstream :</p>
              <p className="mt-1 font-medium">“{st.last_subject}”</p>
              <p className="mt-1 text-xs text-neutral-400">{ago(st.remote_date)}</p>
            </section>
          )}

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
              <HistoryIcon className="size-4" /> Historique
            </h3>
            {events === null ? (
              <p className="text-sm text-neutral-400">Chargement…</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-neutral-400">Aucun évènement enregistré pour l&apos;instant.</p>
            ) : (
              <ol className="relative ml-2 space-y-4 border-l border-black/10 pl-5 dark:border-white/10">
                {events.map((e, i) => (
                  <li key={i} className="relative">
                    <span
                      className={`absolute -left-[26px] top-1 size-2.5 rounded-full ${
                        e.event === "updated" ? "bg-emerald-500" : "bg-[#0071e3]"
                      }`}
                    />
                    <p className="text-xs text-neutral-400">{frDay(e.ts)}</p>
                    <p className="text-sm font-medium">
                      {e.event === "updated"
                        ? `🔄 Mis à jour (${e.from || "?"} → ${e.to || "?"})`
                        : `📬 Upstream a bougé${e.behind ? ` · ${e.behind} commit(s) de retard` : ""}${e.release ? ` · release ${e.release}` : ""}`}
                    </p>
                    {(e.new_commits || []).slice(0, 4).map((c) => (
                      <p key={c.sha} className="truncate text-xs text-neutral-500" title={c.subject}>
                        <code className="text-[#0071e3]">{c.sha}</code> {c.subject}
                      </p>
                    ))}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </motion.aside>
    </>
  );
}
