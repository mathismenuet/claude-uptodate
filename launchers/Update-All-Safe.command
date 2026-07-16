#!/bin/bash
# Claude UpToDate — met à jour tout ce qui est SÛR (git pull --ff-only, refuse les modifs locales)
# Updates everything SAFE (ff-only; items with local changes are skipped)
cd "$(dirname "$0")/.."
echo "Éléments concernés : tout ce qui est en retard SANS modifications locales."
read -r -p "Tout mettre à jour ? / Update all? [o/y/N] " a
case "$a" in
  o|O|y|Y)
    node bin/uptodate.mjs update --all
    echo
    echo "— Re-check rapide —"
    node bin/uptodate.mjs check --no-fetch >/dev/null 2>&1 || true
    node bin/uptodate.mjs report | head -40
    ;;
  *) echo "Annulé / cancelled." ;;
esac
echo
read -r -p "Entrée / Enter pour fermer…"
