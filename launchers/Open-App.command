#!/bin/bash
# Claude UpToDate — ouvre l'App Store visuel (démarre le serveur local si besoin)
# Open the visual App Store (starts the local server if needed)
set -e
cd "$(dirname "$0")/.."
PORT="${CLAUDE_UPTODATE_PORT:-4517}"

if curl -s "http://localhost:$PORT" >/dev/null 2>&1; then
  open "http://localhost:$PORT"
  exit 0
fi

if [ ! -d node_modules ]; then
  echo "Première installation / first install (npm install)…"
  npm install
fi

( until curl -s "http://localhost:$PORT" >/dev/null 2>&1; do sleep 1; done
  open "http://localhost:$PORT" ) &

echo "Serveur sur http://localhost:$PORT — laisser cette fenêtre ouverte (Ctrl-C pour quitter)."
npm run dev -- -p "$PORT"
