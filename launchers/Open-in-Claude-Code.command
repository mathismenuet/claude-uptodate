#!/bin/bash
# Claude UpToDate — ouvre Claude Code sur ce dossier avec la mission "check + digest"
# Opens Claude Code in this folder with a "check + digest" mission
cd "$(dirname "$0")/.."
if ! command -v claude >/dev/null 2>&1; then
  echo "Claude Code CLI introuvable. Installe-le : npm install -g @anthropic-ai/claude-code"
  read -r -p "Entrée / Enter pour fermer…"
  exit 1
fi
exec claude "Lance un check Claude UpToDate : exécute \`node bin/uptodate.mjs check\`, puis présente-moi le digest en clair (nouveautés, retards, releases) et propose les mises à jour possibles. Ne mets RIEN à jour sans mon accord explicite."
