# Changelog

Toutes les évolutions notables de Claude UpToDate. / All notable changes.

## [0.4.1] — 2026-07-17

### Corrigé / Fixed
- **Boutons « Mettre à jour » qui ne faisaient rien** (skills CLI) : quand
  `npx skills update` ne change rien — contenu identique malgré des commits upstream,
  ou **skill supprimé du repo source** (ex. lenny-skills reconstruit, remotion-dev
  réorganisé) — l'alerte est désormais **acquittée** (`acks.json`) : l'élément passe
  « À jour ✓ » et ne re-flaggera qu'au prochain vrai changement upstream.
- Le **résultat de chaque mise à jour s'affiche** dans un bandeau visible de la page
  (avant : uniquement dans le panneau détail → échecs silencieux).

## [0.4.0] — 2026-07-17

### Ajouté / Added
- **🔌 Connexions** (`engine/connections.mjs`) : cartographie des MCP des 4 familles
  (serveurs perso `~/.claude.json`, MCP de plugins, connecteurs claude.ai, extensions
  desktop) avec **état réel** via `claude mcp list` (🟢 connecté / 🟠 auth requise /
  🔴 injoignable), groupés par catégorie d'usage, filtres d'état, et **actions de
  reconnexion** (lien claude.ai/settings/connectors, commande terminal copiable,
  test de la commande du serveur). Cache 30 min, bouton « Re-tester ».
- **🔑 Clés API** : inventaire des clés connues (noms uniquement, jamais les valeurs) —
  définies où (~/.zshrc, settings.json, .env projet, session) — avec les features
  débloquées et le lien « obtenir une clé » ; détection des clés supplémentaires.
- **🐳 Stacks Docker** : conteneurs actifs groupés par projet compose (Twenty CRM,
  Invoice Ninja, n8n…) + commande de mise à jour copiable.
- **🍺 Homebrew** : paquets/apps en retard détectés au check, section dédiée dans
  Mises à jour + bouton « Mettre à jour » (brew upgrade) + rapport CLI.
- **« Vérifier » re-scanne l'inventaire** : les nouveaux clones/skills installés
  depuis le dernier check apparaissent désormais immédiatement.
- CLI : `connections [--refresh]`.

## [0.3.0] — 2026-07-17

### Ajouté / Added
- **M3 Surfaces multi-LLM** (`engine/surfaces.mjs`) : détection des applis IA de la
  machine (Claude Code, Codex, Gemini/Antigravity, Cursor, OpenCode, Ollama),
  inventaire par surface, **doublons inter-surfaces** avec comparaison de contenu
  (hash SKILL.md) → identique ✅ / désynchronisé ⚠️, resynchronisation depuis la copie
  la plus récente (sauvegarde `.bak-<date>`). Onglet 🗺 Surfaces + CLI `surfaces`.
- **📊 Dashboard d'utilisation** (`engine/usage.mjs`) : scan incrémental des
  transcripts Claude Code (`~/.claude/projects/**/*.jsonl`, cache par fichier) —
  skills invoqués, appels MCP, commandes slash. KPIs, activité par semaine
  (palette catégorielle validée daltonisme/contraste), top outils, **drill-down par
  outil : date, dossier projet, extrait du prompt, et `claude --resume <session>`
  pour rouvrir la conversation**. Section « installés mais jamais invoqués ».
  CLI `usage [nom]`. 100 % local.
- **❔ Légende** : tous les codes visuels (pastilles, icônes, badges, couleurs) +
  **cartographie** de où vivent skills/plugins/MCP/repos et quelles applis les voient
  (Claude Code CLI/desktop/IDE vs claude.ai web, Codex, Gemini/Antigravity, Cursor).
- **Bibliothèque** : date d'installation sur chaque fiche (birthtime) + **tris**
  (nom, installé récemment/anciennement, les plus utilisés) + badge « N× » d'usage.

## [0.2.0] — 2026-07-16

### Ajouté / Added
- **M2 Bibliothèque** (`engine/library.mjs`) : scan de TOUT l'outillage IA de la machine
  (skills Claude user + marketplaces de plugins + Codex + Gemini/Antigravity), ~943 outils
  classés en 17 catégories d'usage par mots-clés + annotations soignées « quand y penser »
  pour les outils clés, dédupliqués par realpath, surcharges persistantes
  (`library-overrides.json`).
- **Onglet 📚 Bibliothèque** : chips catégories, recherche, fiches avec invocation
  copiable + badge surface (Claude/Codex/Gemini) + provenance.
- **🧺 Paniers de mission** (`baskets.json`, personnalisables) : kits d'outils par type de
  tâche + bouton « Copier le brief pour Claude » (markdown prêt à coller en début de session).
- CLI : `uptodate library [--refresh]`.
- `docs/PRD.md` : cadrage v0.2 → v0.5 (bibliothèque, surfaces multi-LLM, conseiller, self-update).

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
