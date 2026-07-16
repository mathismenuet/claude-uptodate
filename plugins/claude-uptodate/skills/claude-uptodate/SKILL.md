---
name: claude-uptodate
description: Local "App Store" for everything installed from GitHub on this machine — cloned repos, Claude Code skills and plugin marketplaces. Use when the user asks "is X up to date?", "what's new in my repos / skills / plugins?", "check updates", "update X", "update history", "find the source of skill X" — or the French equivalents ("quoi de neuf dans mes repos ?", "mets à jour X", "mes skills sont-ils à jour ?", "retrouve la source du skill X"). Checks upstream via git + GitHub API, keeps an append-only history, applies safe ff-only updates, and offers a visual dashboard.
---

# Claude UpToDate

This plugin was installed from a Claude Code marketplace, which means **the full app repo
is cloned on this machine**. Resolve it once:

```bash
APP_ROOT="$(cd "${CLAUDE_PLUGIN_ROOT}/../.." && pwd)"
```

Everything below runs from `$APP_ROOT`. Requirements: Node 18+, git. `gh` (GitHub CLI,
logged in) is optional but strongly recommended — without it the GitHub API fallback is
rate-limited to 60 req/h.

## CLI (headless — what you run for the user)

```bash
node "$APP_ROOT/bin/uptodate.mjs" scan                 # (re)build the inventory
node "$APP_ROOT/bin/uptodate.mjs" check                # check everything, write state + history + report
node "$APP_ROOT/bin/uptodate.mjs" report               # re-print last report
node "$APP_ROOT/bin/uptodate.mjs" update <name>|--all  # safe updates (ff-only, refuses dirty)
node "$APP_ROOT/bin/uptodate.mjs" map <skill> <owner/repo> [--path sub/dir]
node "$APP_ROOT/bin/uptodate.mjs" history [name]
```

Data lives in `~/.claude/repo-radar/` (config.json to customize scan roots, history.jsonl
is the append-only event log).

## Visual dashboard

```bash
cd "$APP_ROOT" && [ -d node_modules ] || npm install
npm run dev -- -p 4517     # → http://localhost:4517
```

macOS users can also double-click `launchers/Open-App.command`.

## Agent behavior

1. **"What's new?" / check requests** → run `check`, then present the digest in the
   user's language. Lead with 🆕 (new since last check) and 🔴 (behind), and summarize what
   the new commits/releases actually BRING — no raw commit dumps.
2. **Never update without an explicit request.** `check` is read-only. When the engine
   refuses an update (local modifications), explain and suggest stash/commit — never force.
3. **Orphan skills** (❓ section): when asked to find a skill's source, read the skill's
   own SKILL.md, search GitHub / skills.sh, VERIFY the upstream content matches, then run
   `map`. Ask before mapping when unsure.
4. **First run on a new machine**: `scan` then `check`. Review `~/.claude/repo-radar/config.json`
   with the user (scan_roots defaults to `~/Downloads/VibeCoding` — adapt it to where THEY
   keep cloned repos).
5. **Automation**: offer a weekly scheduled task (e.g. Monday morning) that runs `check`
   and presents the digest — read-only, never auto-update.
