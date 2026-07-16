<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Convention — chargement de données côté client

Toute page/composant qui charge des données côté client **doit converger vers un état
terminal** (données / vide / erreur) en quelques secondes — **jamais un spinner animé sans
fin**. Un chargement infini fait boucler les agents IA en auto-pilote et fige la machine.

→ Utiliser le hook fourni **`@/lib/use-data`** (`useData<T>(url)`) : il intègre déjà un
timeout (12 s), la gestion d'erreur et `loading` borné. Ne pas réécrire un `fetch` + état de
chargement « à la main » sans timeout ni `try/catch/finally`.

```tsx
"use client";
import { useData } from "@/lib/use-data";

export function Panel() {
  const { data, error, loading, refresh } = useData<MyType>("/api/data");
  if (loading) return <Spinner />;                  // borné par le timeout
  if (error)   return <ErrorState msg={error} onRetry={refresh} />; // état STATIQUE
  return <View data={data!} />;
}
```

---

# Claude UpToDate — guide agent

**Ce qu'est ce projet** : l'App Store local de tout ce qui vient de GitHub sur la machine
de l'utilisateur — repos clonés, skills Claude Code (git / skills-CLI / mappés) et
marketplaces de plugins. Détection des mises à jour, changelogs, historique, mises à jour
sûres.

## Architecture (à respecter)

| Couche | Fichier(s) | Règle |
|---|---|---|
| **Moteur** | `engine/core.mjs` | Source de vérité UNIQUE. ESM zéro-dépendance. Tout sous-processus passe par `sh()` (`spawn`, `shell:false`, timeout). |
| **CLI** | `bin/uptodate.mjs` | Wrapper mince du moteur — utilisé par cron/tâches planifiées/agents. |
| **API** | `app/api/*/route.ts` | Wrappers minces du moteur. `assertLocal()` obligatoire (localhost only). |
| **UI** | `app/page.tsx` + `components/store/` | Français, esthétique App Store. Aucune logique métier — tout vient de l'API. |
| **Plugin** | `.claude-plugin/` + `plugins/claude-uptodate/` | Distribution Claude Code. `${CLAUDE_PLUGIN_ROOT}/../..` = racine du repo cloné par la marketplace. |
| **Lanceurs** | `launchers/*.command` | Chemins RELATIFS uniquement (portables). |

## Contrats de données (compatibilité ascendante OBLIGATOIRE)

Les données vivent dans `~/.claude/repo-radar/` (env `REPO_RADAR_DATA` pour surcharger) :
`config.json`, `manifest.json`, `state.json`, `mapping.json`, `history.jsonl` (append-only —
c'est l'historique de l'utilisateur, ne jamais le réécrire ni changer le schéma des
évènements sans migration), `reports/`, `latest.md`.

## Règles produit

1. **Jamais de mise à jour non demandée.** `check` est en lecture seule (git fetch au plus).
2. **`update` refuse** tout élément avec modifs locales (dirty/ahead) — ff-only sinon.
3. Élément inconnu ≠ erreur : les skills « orphelins » sont un état normal, on les mappe
   progressivement (`map`).
4. Release = bump `version` dans `package.json` + `plugin.json` + `marketplace.json`,
   entrée `CHANGELOG.md`, tag `vX.Y.Z`, release GitHub.
