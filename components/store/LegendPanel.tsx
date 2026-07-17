"use client";
import { FolderGit2, Sparkles, Store, Wand2, PackageSearch, AlertTriangle } from "lucide-react";
import { CATEGORIES } from "./meta-categories";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1c1c1e]">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-400">{title}</h3>
      {children}
    </section>
  );
}

function Row({ sample, label }: { sample: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-4 py-1.5">
      <span className="w-56 shrink-0">{sample}</span>
      <span className="text-[13px] text-neutral-600 dark:text-neutral-300">{label}</span>
    </div>
  );
}

export function LegendPanel() {
  return (
    <div className="space-y-5">
      {/* ---- Pastilles d'état (onglets Mises à jour) ---- */}
      <Section title="Pastilles d'état — onglet Mises à jour">
        <Row sample={<span className="rounded-full bg-[#0071e3] px-4 py-1.5 text-[12px] font-semibold text-white">METTRE À JOUR</span>}
          label="Mise à jour disponible ET applicable sans risque (git pull --ff-only, aucune modif locale). Le badge rouge sur l'icône = nombre de commits de retard." />
        <Row sample={<span className="flex w-fit items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1.5 text-[12px] font-semibold text-amber-600 dark:text-amber-400"><AlertTriangle className="size-3.5" /> MANUEL</span>}
          label="Mise à jour dispo MAIS tu as des modifications locales (fichiers modifiés ou commits non poussés) → l'outil refuse d'y toucher, à réconcilier à la main." />
        <Row sample={<span className="rounded-full bg-indigo-500/15 px-3 py-1.5 text-[12px] font-semibold text-indigo-600 dark:text-indigo-400">MAJ DISPO</span>}
          label="Skill mappé (copié sans git) : l'upstream a bougé, réinstallation manuelle depuis la source." />
        <Row sample={<span className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-neutral-400">À JOUR ✓</span>}
          label="Rien de nouveau upstream." />
        <Row sample={<span className="rounded-full bg-neutral-500/10 px-3 py-1.5 text-[12px] font-semibold text-neutral-500 dark:text-neutral-400">MODIFIÉ ✏️</span>}
          label="À jour, mais modifié localement (info, pas un problème)." />
        <Row sample={<span className="rounded-full bg-sky-500/10 px-3 py-1.5 text-[12px] font-semibold text-sky-600 dark:text-sky-400">BASELINE 📍</span>}
          label="Premier pointage d'un skill mappé : référence posée, comparaison au prochain check." />
        <Row sample={<span className="rounded-full bg-red-500/10 px-3 py-1.5 text-[12px] font-semibold text-red-500">ERREUR</span>}
          label="Vérification impossible (réseau, source disparue, upstream introuvable)." />
      </Section>

      {/* ---- Icônes de type ---- */}
      <Section title="Icônes de type">
        <Row sample={<span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600"><FolderGit2 className="size-5 text-white" /></span>}
          label="Repo GitHub tiers cloné sur ton disque (bleu)." />
        <Row sample={<span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-violet-400 to-purple-600"><Sparkles className="size-5 text-white" /></span>}
          label="Skill installé comme clone git (violet)." />
        <Row sample={<span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-400 to-pink-600"><Wand2 className="size-5 text-white" /></span>}
          label="Skill géré par le skills CLI — npx skills (rose)." />
        <Row sample={<span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-600"><PackageSearch className="size-5 text-white" /></span>}
          label="Skill orphelin mappé manuellement à sa source (indigo)." />
        <Row sample={<span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600"><Store className="size-5 text-white" /></span>}
          label="Marketplace de plugins Claude Code (orange) — la mettre à jour rafraîchit tous ses plugins." />
      </Section>

      {/* ---- Badges de surface ---- */}
      <Section title="Badges de surface (Bibliothèque & Surfaces)">
        <Row sample={<span className="rounded-full bg-[#0071e3]/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-[#0071e3]">claude</span>}
          label="Vu par Claude Code (toutes ses fenêtres sur cette machine)." />
        <Row sample={<span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">codex</span>}
          label="Vu par Codex (OpenAI) uniquement." />
        <Row sample={<span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-purple-600 dark:text-purple-400">gemini</span>}
          label="Vu par Gemini CLI / Antigravity uniquement." />
        <Row sample={<span className="text-[12px] text-neutral-500">installé · 🏬 marketplace</span>}
          label="Provenance : « installé » = dossier skill chez toi ; « 🏬 <nom> » = disponible via une marketplace de plugins." />
      </Section>

      {/* ---- Couleurs du dashboard ---- */}
      <Section title="Couleurs du Dashboard (palette validée daltonisme & contraste)">
        <div className="cud-viz">
          <Row sample={<span className="flex items-center gap-2"><span className="inline-block h-3 w-10 rounded" style={{ background: "var(--s-skill)" }} /><b className="text-[12px]">Skills</b></span>}
            label="Invocations du tool Skill (skills & plugins)." />
          <Row sample={<span className="flex items-center gap-2"><span className="inline-block h-3 w-10 rounded" style={{ background: "var(--s-mcp)" }} /><b className="text-[12px]">MCP</b></span>}
            label="Appels d'outils MCP (connecteurs, extensions desktop)." />
          <Row sample={<span className="flex items-center gap-2"><span className="inline-block h-3 w-10 rounded" style={{ background: "var(--s-cmd)" }} /><b className="text-[12px]">Commandes</b></span>}
            label="Commandes slash (/nom) tapées dans les sessions." />
        </div>
      </Section>

      {/* ---- Catégories ---- */}
      <Section title="Catégories d'usage (Bibliothèque)">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <span key={c.id} className="rounded-full bg-black/[.05] px-3 py-1 text-[12px] font-medium dark:bg-white/[.08]">
              {c.emoji} {c.label}
            </span>
          ))}
          <span className="rounded-full bg-black/[.05] px-3 py-1 text-[12px] font-medium dark:bg-white/[.08]">❓ À classer</span>
        </div>
        <p className="mt-3 text-[12px] text-neutral-500">
          Classement automatique par mots-clés + corrections soignées pour tes outils clés.
          Pour corriger une fiche : <code>~/.claude/repo-radar/library-overrides.json</code>.
        </p>
      </Section>

      {/* ---- Cartographie ---- */}
      <Section title="🗺 Cartographie — où vivent tes outils, et QUI les voit">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-neutral-400">
                <th className="pb-2 pr-4">Emplacement</th>
                <th className="pb-2 pr-4">Ce qui y vit</th>
                <th className="pb-2">Qui le voit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 align-top dark:divide-white/[.06] [&_td]:py-2.5 [&_td]:pr-4">
              <tr>
                <td><code>~/.claude/skills</code><br /><span className="text-neutral-400">(+ liens vers ~/.agents/skills)</span></td>
                <td>Tes skills « user » (168+)</td>
                <td><b>Tout Claude Code sur CETTE machine</b> : le terminal (claude CLI), l'app desktop Claude/Cowork, les extensions IDE (VS Code, JetBrains). <b>PAS</b> claude.ai web, <b>PAS</b> Codex/Gemini (sauf copie).</td>
              </tr>
              <tr>
                <td><code>~/.claude/plugins</code></td>
                <td>Marketplaces + 111 plugins (skills, commandes, agents)</td>
                <td>Claude Code uniquement — mais toutes ses fenêtres (CLI, desktop, IDE).</td>
              </tr>
              <tr>
                <td><code>&lt;projet&gt;/.claude/</code></td>
                <td>Skills/commandes/settings d'UN projet</td>
                <td>Quiconque ouvre ce projet avec Claude Code — partageable via git (c'est comme ça qu'OpenMontage embarque ses skills).</td>
              </tr>
              <tr>
                <td>MCP — 3 familles</td>
                <td>Connecteurs & serveurs d'outils</td>
                <td>① <b>Connecteurs claude.ai</b> (réglés sur claude.ai) → Claude web + app Claude. ② <b>MCP Claude Code</b> (<code>claude mcp</code>, <code>.mcp.json</code>) → CLI/desktop/IDE. ③ <b>Extensions desktop</b> (WhatsApp, Photoshop…) → app Claude desktop seulement.</td>
              </tr>
              <tr>
                <td><code>~/.codex/skills</code></td>
                <td>Skills Codex (+ AGENTS.md)</td>
                <td>Codex (OpenAI) CLI/IDE uniquement.</td>
              </tr>
              <tr>
                <td><code>~/.gemini/skills</code></td>
                <td>Skills Gemini (+ GEMINI.md)</td>
                <td>Gemini CLI <b>et</b> Antigravity (ils partagent ~/.gemini).</td>
              </tr>
              <tr>
                <td><code>~/.cursor</code>, <code>.cursorrules</code></td>
                <td>Règles/extensions Cursor</td>
                <td>Cursor uniquement (pas de dossier skills standard).</td>
              </tr>
              <tr>
                <td>Repos clonés (ex. <code>~/Downloads/VibeCoding</code>)</td>
                <td>Code, outils, templates</td>
                <td>Tout agent qui lit ton disque — c'est le seul « partout ». Mais rien ne les met à jour… sauf cet outil.</td>
              </tr>
              <tr>
                <td>☁️ claude.ai (web)</td>
                <td>Skills cloud d'Anthropic + connecteurs</td>
                <td>Ne voit <b>RIEN</b> de local : ni tes skills, ni tes repos. Ce qui y est configuré ne redescend pas ici (et inversement).</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 rounded-xl bg-[#0071e3]/5 px-4 py-3 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-300">
          <b>À retenir :</b> « Claude Code » = un seul moteur avec plusieurs fenêtres (terminal, app
          desktop/Cowork, IDE) qui partagent <code>~/.claude</code> → installer un skill une fois le rend
          disponible partout <i>dans Claude Code</i>. Les autres applis (Codex, Gemini/Antigravity,
          Cursor) ont chacune leur dossier → d'où les <b>doublons</b> que l'onglet Surfaces surveille.
          Claude <i>web</i> est un monde à part (cloud).
        </p>
      </Section>
    </div>
  );
}
