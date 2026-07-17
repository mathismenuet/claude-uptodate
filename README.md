# 📡 Claude UpToDate

**The local App Store for everything you installed from GitHub** — cloned repos, Claude
Code skills, and plugin marketplaces. See what's behind, read the changelog, update safely,
keep the history.

> You clone a repo, copy a skill, add a plugin marketplace… and six months later you have
> no idea what's outdated, what changed upstream, or where half of it even came from.
> Claude UpToDate answers that, visually.

## What it does

- 🗂 **Inventory** — auto-discovers third-party git clones (your own repos are excluded),
  skills (git clones, `npx skills` lock file, manually mapped), and Claude Code plugin
  marketplaces
- 🔴 **Update badges** — behind-count per item, App Store style
- 📜 **Changelogs** — the actual upstream commits & latest release for each item
- 🕰 **History** — append-only journal: *"updated on July 16 — here's what arrived"*
- 📚 **Library** — every skill on the machine (Claude user skills, plugin marketplaces,
  Codex, Gemini) classified into 17 usage categories with "when to think of it"
  annotations, install dates, sorting, plus **mission baskets** and a copy-paste
  tooling brief for Claude
- 📊 **Usage dashboard** — mines your local Claude Code transcripts (incremental,
  100% local): most-used tools, weekly activity, never-invoked skills, and per-tool
  drill-down showing **when, in which conversation and on which prompt** — with a
  `claude --resume <session>` command to reopen it
- 🗺 **Multi-LLM surfaces** — detects Codex, Gemini/Antigravity, Cursor…, inventories
  their skills, and flags **cross-app duplicates** as identical ✅ or out-of-sync ⚠️
  (one-click resync from the newest copy, with backup)
- 🔌 **Connections** — maps every MCP across all 4 families (your servers, plugin MCPs,
  claude.ai connectors, desktop extensions) with **real health status**
  (connected / needs auth / unreachable), grouped by category, and **one-click
  reconnect actions**; plus an API-key inventory (names only, never values) and your
  local Docker stacks with copyable update commands
- 🍺 **Homebrew** — outdated formulae/casks surface in the updates list with a safe
  per-item upgrade button
- ❔ **Legend** — every visual code explained + a map of where skills/plugins/MCP/repos
  live and which apps can see them
- ⬇️ **Safe updates** — `git pull --ff-only` only; anything with local modifications is
  refused and flagged for manual handling
- ❓ **Orphan skills** — skills copied without provenance are listed; map them to their
  source repo one by one (or let Claude find the source for you)
- 🤖 **Claude Code native** — ships as a plugin with an `/uptodate` command and a skill

## Install

### Option A — as a Claude Code plugin (recommended)

```bash
claude plugin marketplace add mathismenuet/claude-uptodate
claude plugin install claude-uptodate@claude-uptodate
```

You get the `/uptodate` command + the skill. The full app is cloned with the marketplace —
Claude knows how to launch the dashboard from there.

### Option B — clone it

```bash
git clone https://github.com/mathismenuet/claude-uptodate.git
cd claude-uptodate
npm install
npm run dev -- -p 4517     # → http://localhost:4517
```

macOS: double-click `launchers/Open-App.command` instead (also:
`Check-Now.command`, `Update-All-Safe.command`, `Open-in-Claude-Code.command`).

## CLI (no UI needed — great for cron / scheduled agents)

```bash
node bin/uptodate.mjs scan                 # (re)build the inventory
node bin/uptodate.mjs check                # check everything → state + history + report
node bin/uptodate.mjs report               # re-print the last report
node bin/uptodate.mjs update <name>|--all  # safe updates (ff-only, refuses local changes)
node bin/uptodate.mjs map <skill> <owner/repo> [--path sub/dir]
node bin/uptodate.mjs history [name]       # the timeline
node bin/uptodate.mjs library [--refresh]  # typology library + mission baskets
node bin/uptodate.mjs usage [name]         # usage stats / per-tool drill-down
node bin/uptodate.mjs surfaces             # multi-LLM surfaces + duplicates
node bin/uptodate.mjs connections          # MCP health map + API keys + Docker
```

## Configuration

Data lives in `~/.claude/repo-radar/` (override with `REPO_RADAR_DATA`). Edit
`config.json` — created on first run:

| Key | Default | Meaning |
|---|---|---|
| `scan_roots` | `[{"path": "~/Downloads/VibeCoding", "maxdepth": 3}]` | Where your cloned repos live — **adapt this** |
| `github_login` | auto (`gh api user`) | Your repos are skipped (you author them) |
| `track_own_repos` | `false` | Set `true` to track your own repos too |
| `skills_dirs` | `~/.claude/skills`, `~/.agents/skills` | Where skills are installed |
| `marketplaces_dir` | `~/.claude/plugins/marketplaces` | Claude Code plugin marketplaces |

Requirements: **Node 18+**, **git**. **`gh` (GitHub CLI, logged in) recommended** — the
anonymous API fallback is limited to 60 req/h. macOS/Linux.

## Safety model

- `check` is **read-only** (`git fetch` at most) — it never changes your working trees
- `update` is **ff-only** and **refuses** any repo with uncommitted changes or unpushed
  commits
- The web API only answers **localhost**
- History (`history.jsonl`) is append-only — your audit trail is never rewritten

## 🇫🇷 En bref

L'App Store local de tout ce que tu as installé depuis GitHub : repos clonés, skills et
plugins Claude Code. Badges de mise à jour, changelogs, historique daté, mises à jour sûres
(ff-only, refuse les modifs locales), skills orphelins à mapper. Interface en français.
Installe-le comme plugin Claude Code (option A) ou clone-le (option B) ; sur macOS,
double-clique les lanceurs dans `launchers/`.

## License

[MIT](LICENSE) — © 2026 Mathis Menuet

🤖 Built with [Claude Code](https://claude.com/claude-code)
