// claude-uptodate — M3 Surfaces multi-LLM
// Détecte les applis/CLI IA présentes sur la machine, inventorie leurs skills,
// repère les DOUBLONS inter-surfaces (même skill copié chez Claude, Codex,
// Gemini…) et dit s'ils sont identiques ou désynchronisés (hash du SKILL.md).
// Peut resynchroniser (copie la plus récente → les autres, avec sauvegarde).
import { createHash } from "node:crypto";
import { promises as fs, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const H = os.homedir();
const j = (...p) => path.join(H, ...p);

export const SURFACE_DEFS = [
  { id: "claude", label: "Claude Code", icon: "🟦", skillsDirs: [j(".claude", "skills"), j(".agents", "skills")], probe: [j(".claude")], note: "CLI + app desktop (Cowork) + extensions IDE — même moteur, mêmes skills." },
  { id: "codex", label: "Codex (OpenAI)", icon: "🟩", skillsDirs: [j(".codex", "skills")], probe: [j(".codex")], note: "CLI/IDE Codex — AGENTS.md + ~/.codex/skills." },
  { id: "gemini", label: "Gemini CLI / Antigravity", icon: "🟪", skillsDirs: [j(".gemini", "skills")], probe: [j(".gemini"), j(".antigravity")], note: "GEMINI.md + ~/.gemini/skills, partagés avec Antigravity." },
  { id: "cursor", label: "Cursor", icon: "⬛", skillsDirs: [], probe: [j(".cursor")], note: "Règles/extensions propres (.cursor, .cursorrules par projet) — pas de dossier skills standard." },
  { id: "opencode", label: "OpenCode", icon: "⬜", skillsDirs: [], probe: [j(".config", "opencode")], note: "Config ~/.config/opencode." },
  { id: "ollama", label: "Ollama (modèles locaux)", icon: "🦙", skillsDirs: [], probe: [j(".ollama")], note: "Modèles locaux — pas de skills, veille seulement." },
];

async function listSkillDirs(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const c of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (c.isDirectory() && !c.name.startsWith(".")) out.push(path.join(dir, c.name));
  }
  return out;
}

async function hashSkill(dir) {
  // hash du SKILL.md si présent, sinon empreinte de la liste des fichiers de 1er niveau
  const f = path.join(dir, "SKILL.md");
  try {
    const buf = await fs.readFile(f);
    return createHash("sha1").update(buf).digest("hex").slice(0, 12);
  } catch {
    const names = (await fs.readdir(dir).catch(() => [])).sort().join("|");
    return "dir:" + createHash("sha1").update(names).digest("hex").slice(0, 8);
  }
}

async function mtimeOf(dir) {
  const f = path.join(dir, "SKILL.md");
  try { return (await fs.stat(f)).mtime.toISOString(); } catch {
    try { return (await fs.stat(dir)).mtime.toISOString(); } catch { return null; }
  }
}

export async function detectSurfaces() {
  const surfaces = [];
  for (const def of SURFACE_DEFS) {
    const detected = def.probe.some((p) => existsSync(p));
    let skills = 0;
    const seen = new Set();
    for (const sd of def.skillsDirs) {
      for (const d of await listSkillDirs(sd)) {
        let real;
        try { real = await fs.realpath(d); } catch { real = d; }
        if (!seen.has(real)) { seen.add(real); skills += 1; }
      }
    }
    surfaces.push({ ...def, detected, skills, probe: undefined, skillsDirs: def.skillsDirs });
  }
  return surfaces;
}

export async function findDuplicates() {
  // regroupe par NOM de dossier de skill à travers les surfaces à skillsDirs
  const copies = new Map(); // name -> [{surface, dir, hash, mtime}]
  for (const def of SURFACE_DEFS) {
    const seen = new Set();
    for (const sd of def.skillsDirs) {
      for (const d of await listSkillDirs(sd)) {
        let real;
        try { real = await fs.realpath(d); } catch { real = d; }
        if (seen.has(real)) continue;
        seen.add(real);
        const name = path.basename(d);
        (copies.get(name) || copies.set(name, []).get(name)).push({ surface: def.id, dir: real });
      }
    }
  }
  const dups = [];
  for (const [name, list] of copies) {
    const surfaces = new Set(list.map((c) => c.surface));
    if (surfaces.size < 2) continue; // doublon = présent sur ≥ 2 surfaces
    for (const c of list) {
      c.hash = await hashSkill(c.dir);
      c.mtime = await mtimeOf(c.dir);
    }
    const hashes = new Set(list.map((c) => c.hash));
    const newest = [...list].sort((a, b) => String(b.mtime).localeCompare(String(a.mtime)))[0];
    dups.push({
      name,
      copies: list,
      identical: hashes.size === 1,
      newest: newest.dir,
      newest_surface: newest.surface,
    });
  }
  return dups.sort((a, b) => Number(a.identical) - Number(b.identical) || a.name.localeCompare(b.name));
}

export async function syncDuplicate(name) {
  const dups = await findDuplicates();
  const d = dups.find((x) => x.name === name);
  if (!d) return { ok: false, log: [`Aucun doublon nommé « ${name} ».`] };
  if (d.identical) return { ok: true, log: [`${name} : copies déjà identiques — rien à faire.`] };
  const log = [];
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  for (const c of d.copies) {
    if (c.dir === d.newest) continue;
    const backup = `${c.dir}.bak-${stamp}`;
    try {
      await fs.rename(c.dir, backup);
      await fs.cp(d.newest, c.dir, { recursive: true });
      log.push(`✓ ${c.surface} : resynchronisé depuis ${d.newest_surface} (sauvegarde : ${path.basename(backup)})`);
    } catch (e) {
      log.push(`✗ ${c.surface} : ${String(e).slice(0, 160)}`);
    }
  }
  return { ok: true, log };
}

export async function surfacesReport() {
  return {
    generated_at: new Date().toISOString(),
    surfaces: await detectSurfaces(),
    duplicates: await findDuplicates(),
  };
}
