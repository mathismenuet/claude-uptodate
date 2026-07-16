---
description: Check updates for cloned repos, skills and Claude plugins, then present a digest
---

Run the Claude UpToDate check and present the results.

1. Resolve the app root: `APP_ROOT="$(cd "${CLAUDE_PLUGIN_ROOT}/../.." && pwd)"`.
2. Run `node "$APP_ROOT/bin/uptodate.mjs" check` (first run on a new machine: run
   `node "$APP_ROOT/bin/uptodate.mjs" scan` before it).
3. Present the digest in the user's language: start with what's NEW since the last check
   and what's BEHIND, summarizing what the changes bring in plain words (no raw commit
   dump). One line for up-to-date items, one for locally-modified items.
4. End with the possible actions (`update <name>`, `update --all`, open the dashboard) —
   but do NOT update anything unless the user explicitly asks.

$ARGUMENTS may name a specific item to focus on (then filter the digest to it and show its
history via `node "$APP_ROOT/bin/uptodate.mjs" history <name>`).
