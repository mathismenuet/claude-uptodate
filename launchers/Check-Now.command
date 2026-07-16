#!/bin/bash
# Claude UpToDate — vérifie tout maintenant (lecture seule) / check everything now (read-only)
cd "$(dirname "$0")/.."
node bin/uptodate.mjs check
echo
read -r -p "Entrée / Enter pour fermer…"
