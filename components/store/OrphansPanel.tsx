"use client";
import { useState } from "react";
import { HelpCircle, Link2, Loader2 } from "lucide-react";

export function OrphansPanel({
  orphans,
  query,
  onMapped,
}: {
  orphans: string[];
  query: string;
  onMapped: () => void;
}) {
  const [skill, setSkill] = useState("");
  const [slug, setSlug] = useState("");
  const [sub, setSub] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const filtered = orphans.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  async function submit() {
    if (!skill || !slug) return;
    setBusy(true);
    setLog([]);
    try {
      const r = await fetch("/api/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill, slug, path: sub }),
      });
      const j = await r.json();
      setLog(j.log || []);
      if (j.ok) {
        setSkill("");
        setSlug("");
        setSub("");
        onMapped();
      }
    } catch (e) {
      setLog([String(e)]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1c1c1e]">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-neutral-400 to-neutral-600">
            <HelpCircle className="size-5 text-white" />
          </div>
          <div className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            <p className="font-semibold text-neutral-900 dark:text-white">
              {orphans.length} skills copiés sans provenance
            </p>
            <p>
              Impossible de savoir s&apos;ils sont à jour tant qu&apos;on ne connaît pas leur repo
              d&apos;origine. Mappe-les ci-dessous — ou demande à Claude :{" "}
              <em>« retrouve la source du skill X »</em>, il cherche et vérifie pour toi.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            placeholder="nom du skill (ex: gsap)"
            className="rounded-xl border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#0071e3] dark:border-white/15"
          />
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="owner/repo"
            className="rounded-xl border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#0071e3] dark:border-white/15"
          />
          <input
            value={sub}
            onChange={(e) => setSub(e.target.value)}
            placeholder="sous-dossier (optionnel)"
            className="rounded-xl border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#0071e3] dark:border-white/15"
          />
          <button
            onClick={submit}
            disabled={busy || !skill || !slug}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0071e3] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0077ed] disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
            Mapper
          </button>
        </div>
        {log.length > 0 && (
          <div className="mt-3 rounded-xl bg-black/[.04] p-3 font-mono text-xs dark:bg-white/[.06]">
            {log.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {filtered.map((o) => (
          <button
            key={o}
            onClick={() => setSkill(o)}
            className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-[13px] text-neutral-600 transition hover:border-[#0071e3] hover:text-[#0071e3] dark:border-white/10 dark:bg-[#1c1c1e] dark:text-neutral-300"
            title="Cliquer pour pré-remplir le formulaire"
          >
            {o}
          </button>
        ))}
        {!filtered.length && (
          <p className="text-sm text-neutral-400">Aucun skill orphelin ne correspond à la recherche.</p>
        )}
      </div>
    </div>
  );
}
