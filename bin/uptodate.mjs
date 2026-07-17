#!/usr/bin/env node
// CLI claude-uptodate — utilisable sans l'interface web (cron, tâches planifiées, agents).
//   node bin/uptodate.mjs scan | check [--no-fetch] | report | update <nom>|--all | map <skill> <owner/repo> [--path p] | history [nom]
import * as engine from "../engine/core.mjs";
import * as library from "../engine/library.mjs";
import * as usage from "../engine/usage.mjs";
import * as surfaces from "../engine/surfaces.mjs";

const [, , cmd = "help", ...rest] = process.argv;
const has = (f) => rest.includes(f);
const val = (f, d = "") => {
  const i = rest.indexOf(f);
  return i >= 0 && rest[i + 1] ? rest[i + 1] : d;
};
const positional = rest.filter((a, i) => !a.startsWith("--") && rest[i - 1] !== "--path");
const path_short = (p) => (p || "").replace(process.env.HOME || "", "~").split("/").slice(-2).join("/");

async function main() {
  switch (cmd) {
    case "scan": {
      const m = await engine.scan();
      console.log(`Inventaire : ${m.items.length} éléments suivis, ${m.orphans.length} skills sans source, ${m.own_repos_skipped.length} repos perso ignorés.`);
      for (const it of m.items) console.log(`  [${it.type}] ${it.name}${it.slug ? `  ← ${it.slug}` : ""}`);
      break;
    }
    case "check": {
      const { report } = await engine.check({
        fetch: !has("--no-fetch"),
        rescan: has("--rescan"),
        onProgress: (d, t, name) => process.stderr.write(`\r[${d}/${t}] ${name.slice(0, 50).padEnd(50)}`),
      });
      process.stderr.write("\n");
      console.log(report);
      break;
    }
    case "report": {
      const r = await engine.readLatestReport();
      console.log(r || "Aucun rapport. Lance d'abord :  uptodate check");
      break;
    }
    case "update": {
      const res = await engine.update({ name: positional[0] || "", all: has("--all") });
      res.log.forEach((l) => console.log(l));
      if (res.ok) console.log("\nRelance `uptodate check` pour rafraîchir le rapport.");
      process.exitCode = res.ok ? 0 : 1;
      break;
    }
    case "map": {
      const [skill, slug] = positional;
      if (!skill || !slug) { console.log("Usage : uptodate map <skill> <owner/repo> [--path sous/dossier]"); process.exitCode = 1; break; }
      const res = await engine.mapSkill({ skill, slug, path: val("--path") });
      res.log.forEach((l) => console.log(l));
      process.exitCode = res.ok ? 0 : 1;
      break;
    }
    case "library": {
      const lib = await library.readLibrary({ refresh: has("--refresh") });
      console.log(`📚 Bibliothèque : ${lib.count} outils (générée ${lib.generated_at})`);
      for (const c of lib.categories.filter((c) => c.count > 0)) {
        console.log(`  ${c.emoji} ${c.label} : ${c.count}`);
      }
      console.log(`\n🧺 Paniers : ${lib.baskets.map((b) => `${b.emoji} ${b.label} (${b.items.length})`).join(" · ")}`);
      console.log("\nInterface : npm run dev -- -p 4517 → onglet Bibliothèque. --refresh pour re-scanner.");
      break;
    }
    case "usage": {
      if (positional[0]) {
        const d = await usage.readUsage({ name: positional[0] });
        console.log(`🔎 ${d.name} — ${d.total} utilisation(s)`);
        for (const e of d.events.slice(0, 25)) {
          console.log(`  ${(e.ts || "").slice(0, 16).replace("T", " ")} · ${path_short(e.cwd)} · ${e.sessionId.slice(0, 8)}`);
          if (e.snippet) console.log(`     « ${e.snippet} »`);
        }
      } else {
        const d = await usage.readUsage({ refresh: has("--refresh") });
        console.log(`📊 Usage : ${d.totals.events} évènements (${d.totals.skills} skills · ${d.totals.mcp} MCP · ${d.totals.commands} commandes) sur ${d.totals.transcripts} transcripts — ${d.totals.distinct_tools} outils distincts`);
        console.log("\nTop 15 :");
        for (const t of d.tools.slice(0, 15)) {
          console.log(`  ${String(t.count).padStart(4)} × [${t.kind}] ${t.name}  (dernier : ${(t.last || "").slice(0, 10)})`);
        }
        console.log("\nDrill-down : uptodate usage <nom>");
      }
      break;
    }
    case "surfaces": {
      const r = await surfaces.surfacesReport();
      console.log("🗺 Surfaces détectées :");
      for (const s of r.surfaces) {
        console.log(`  ${s.icon} ${s.label} — ${s.detected ? "présent" : "absent"}${s.skills ? ` · ${s.skills} skills` : ""}`);
      }
      const desync = r.duplicates.filter((d) => !d.identical);
      console.log(`\n♻️ Doublons inter-surfaces : ${r.duplicates.length} (dont ${desync.length} désynchronisés)`);
      for (const d of r.duplicates) {
        console.log(`  ${d.identical ? "✅" : "⚠️"} ${d.name} — ${d.copies.map((c) => c.surface).join(" + ")}${d.identical ? "" : ` · + récent : ${d.newest_surface}`}`);
      }
      if (desync.length) console.log("\nResynchroniser : via l'onglet Surfaces de l'app (sauvegarde auto).");
      break;
    }
    case "history": {
      const events = await engine.readHistory({ name: positional[0] || "", limit: parseInt(val("--limit", "40"), 10) });
      if (!events.length) { console.log("Aucun évènement."); break; }
      for (const e of events) {
        const day = (e.ts || "").slice(0, 10);
        if (e.event === "updated") console.log(`🔄 ${day} — ${e.name} mis à jour (${e.from || "?"} → ${e.to || "?"})`);
        else {
          const bits = [];
          if (e.behind) bits.push(`${e.behind} commit(s) de retard`);
          if (e.release) bits.push(`release ${e.release}`);
          if (e.status === "update_available") bits.push("mise à jour dispo");
          console.log(`📬 ${day} — ${e.name} : upstream a bougé${bits.length ? ` (${bits.join(", ")})` : ""}`);
        }
        for (const c of (e.new_commits || []).slice(0, 5)) console.log(`      ${c.sha} ${c.subject}`);
      }
      break;
    }
    default:
      console.log(`claude-uptodate — l'App Store local de tout ce que tu as installé depuis GitHub

Usage : node bin/uptodate.mjs <commande>
  scan                  (re)construit l'inventaire
  check [--no-fetch]    vérifie tout, écrit état + historique + rapport
  report                affiche le dernier rapport
  update <nom>|--all    met à jour (git pull --ff-only, refuse si modifs locales)
  map <skill> <o/r>     relie un skill orphelin à sa source [--path sous/dossier]
  history [nom]         timeline des évènements

Interface web : npm run dev  →  http://localhost:4517`);
  }
}

main().catch((e) => { console.error(e?.stack || String(e)); process.exit(1); });
