# PRD — Claude UpToDate

> Un seul endroit, **local et visuel**, pour tout l'outillage IA d'une machine :
> ce que j'ai (bibliothèque rangée par usage), son état (mises à jour, changelogs,
> historique), ce qui me manque (conseiller personnalisé) — sur **toutes** les
> surfaces LLM (Claude Code, Codex, Gemini CLI, Antigravity, Cursor, OpenCode…).

Statut : v0.1 livrée le 16/07/2026 · ce document cadre v0.2 → v0.5.

## Problème

Un utilisateur intensif d'agents IA accumule des centaines de skills, plugins,
MCP et repos clonés, répartis sur plusieurs outils (Claude Code, Codex, Gemini,
IDE IA…). Résultat :

1. **Il ne sait plus ce qu'il possède** → il n'invoque jamais 90 % de ses outils.
2. **Rien ne le prévient des mises à jour** → dérive silencieuse, bugs corrigés jamais récupérés.
3. **Il ne sait pas ce qui lui manque** pour SES tâches à lui.
4. Chaque surface LLM a ses propres copies → **doublons désynchronisés**.

## Jobs-to-be-done

| # | Job | Module |
|---|-----|--------|
| J1 | « Suis-je à jour ? Qu'est-ce qui est arrivé, quand ? » | M1 Mises à jour ✅ v0.1 |
| J2 | « Qu'est-ce que je possède, et quand y penser ? » — faire ses courses dans son propre magasin | M2 Bibliothèque |
| J3 | « Tous mes outils IA (pas juste Claude) sont-ils sains ? » | M3 Surfaces multi-LLM |
| J4 | « Qu'est-ce qui me manque pour MES usages ? » | M4 Conseiller |
| J5 | « L'outil lui-même reste à jour et se partage » | M5 Self-update ✅ partiel (repo public + plugin) |

## Modules

### M1 — Mises à jour (✅ livré v0.1)

Inventaire (repos tiers, skills git/CLI/mappés, marketplaces), check `git fetch` +
API GitHub, badges de retard, changelogs, releases, historique append-only,
updates ff-only refusant les modifs locales, dashboard + CLI + plugin Claude Code.

**Backlog M1 :**
- [ ] État « supprimé upstream » (skill retiré du repo source) distinct de « MAJ dispo »
- [ ] Notification macOS à la fin du check hebdo (`osascript`)
- [ ] Screenshot dans le README
- [ ] Mapping assisté en masse des skills orphelins (job Claude guidé, par lots de 10)

### M2 — Bibliothèque (v0.2) · « faire ses courses dans son propre magasin »

**Catalogue** : `catalog.json` — pour chaque outil (skill, plugin, MCP, commande) :
`id, nom, surface, source, catégorie, sous-catégorie, description-1-ligne,
quand-y-penser (déclencheurs mentaux), invocation (commande/phrase exacte), tags,
installé/disponible`.

- Généré par scan + **classification IA par lots** (l'agent classe, l'utilisateur
  corrige ; cache persistant, re-classification uniquement des nouveautés).
- **UI onglet « Bibliothèque »** : grille par catégorie d'usage, recherche
  plein-texte, filtres (surface, source, installé/disponible).
- **Paniers (« kits de mission »)** : sélections nommées d'outils pour un type de
  tâche (ex. *Créer une vidéo*, *Prospection*, *Lancer un site*). Prédéfinis +
  personnalisables. **Export « brief d'outillage »** : markdown prêt à coller dans
  une session Claude (« pour cette mission, utilise ces outils : … »).
- Fiche outil : description, quand y penser, invocation copiable, lien source,
  état de mise à jour (pont avec M1).

### M3 — Surfaces multi-LLM (v0.3)

- **Détection automatique** des surfaces présentes : Claude Code, Codex CLI
  (`~/.codex/skills`), Gemini CLI (`~/.gemini/skills`), Antigravity (IDE + app),
  Cursor, OpenCode, Ollama…
- `config.json → surfaces[]` : chemins skills/plugins par surface (extensible).
- Inventaire par surface dans le manifest (`surface` devient un champ de chaque item).
- **Détection des doublons inter-surfaces** : même skill présent sur N surfaces,
  avec diff de contenu (hash) → « désynchronisé » + action « resynchroniser depuis
  la source ».
- Mises à jour là où la provenance est connue (mêmes règles ff-only / API).
- UI : filtre par surface + badge surface sur chaque carte.

### M4 — Conseiller (v0.4) · gap analysis personnalisée

- **Profil local** (`perso/profil.json`, jamais commité) : activité, offres,
  tâches à déléguer, outils favoris, objectifs.
- Croisement : profil × bibliothèque installée × usages réels (historique des
  sessions Claude, **opt-in explicite**) × registres externes (skills.sh via
  `npx skills find`, claude-plugins.dev, registre MCP).
- Sortie : **recommandations priorisées et justifiées** — « déjà possédé mais
  jamais utilisé » (le quick win n°1), « à installer », « à configurer (clé/auth) ».
- UI onglet « Découvrir » : recommandations + recherche directe dans les registres.

### M5 — Self-update & distribution (partiel v0.1)

- ✅ Repo public versionné + releases + plugin marketplace Claude Code.
- [ ] L'app se suit **elle-même** (check des releases GitHub de claude-uptodate,
  bouton « Mettre à jour l'outil » = `git pull` ff-only + `npm install` si besoin).
- [ ] Parité `/uptodate` : sous-commandes `library`, `surfaces`, `advise` au fil
  des modules.

## Non-buts

- Pas de service cloud, pas de compte, pas de télémétrie — tout reste local.
- Jamais d'auto-update silencieux (ni des outils suivis, ni de l'app elle-même).
- Pas de gestionnaire d'installation générique (npm/brew) — périmètre : outillage IA.

## Principes d'architecture (rappel)

Moteur unique `engine/core.mjs` (zéro dépendance) ; UI et CLI = couches minces ;
données compatibles ascendant dans `~/.claude/repo-radar/` ; API localhost only ;
voir `AGENTS.md`.

## Jalons

| Version | Contenu | Critère de done |
|---|---|---|
| v0.2 | M2 Bibliothèque + paniers + backlog M1 (notification, deleted-upstream) | Je retrouve n'importe quel outil en < 10 s et j'exporte un brief de mission |
| v0.3 | M3 Surfaces multi-LLM + doublons | Codex/Gemini/Antigravity visibles, doublons détectés |
| v0.4 | M4 Conseiller + onglet Découvrir | 10 recommandations pertinentes et justifiées sur profil réel |
| v0.5 | M5 complet (self-update) + i18n EN de l'UI | Un tiers installe et met à jour l'outil sans aide |
