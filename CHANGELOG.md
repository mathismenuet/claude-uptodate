# Changelog

Toutes les évolutions notables de Claude UpToDate. / All notable changes.

## [0.1.0] — 2026-07-16

Première release. / Initial release.

### Ajouté / Added
- **Moteur** (`engine/core.mjs`, zéro dépendance) : inventaire des repos GitHub tiers
  clonés, skills Claude Code (clones git, lock `npx skills`, mappés manuellement) et
  marketplaces de plugins ; check upstream via `git fetch` + API GitHub (gh CLI avec repli
  anonyme) ; historique append-only (`history.jsonl`) ; rapports markdown datés.
- **CLI** (`bin/uptodate.mjs`) : `scan` / `check` / `report` / `update` / `map` / `history`.
- **Dashboard web** (Next.js, localhost only) : liste façon App Store avec badges de
  retard, onglets par catégorie, recherche, panneau détail (changelog, release, timeline),
  « Tout mettre à jour (sûr) », mapping des skills orphelins.
- **Sécurité** : mises à jour ff-only uniquement, refus si modifs locales ; API limitée à
  localhost ; sous-processus sans shell.
- **Distribution Claude Code** : marketplace + plugin (`/uptodate` + skill).
- **Lanceurs macOS** (`launchers/*.command`) : ouvrir l'app, vérifier, tout mettre à jour,
  ouvrir dans Claude Code.
