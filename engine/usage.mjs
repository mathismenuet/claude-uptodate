// claude-uptodate — M3 Usage
// Mine les transcripts Claude Code (~/.claude/projects/**/*.jsonl) pour savoir
// QUELS outils (skills, MCP, commandes slash) sont réellement utilisés, QUAND,
// et DANS QUELLE conversation. Scan incrémental : un fichier inchangé
// (taille+mtime) n'est jamais relu. Zéro dépendance.
import { createReadStream, promises as fs, existsSync } from "node:fs";
import readline from "node:readline";
import os from "node:os";
import path from "node:path";
import { DATA } from "./core.mjs";

const USAGE_F = path.join(DATA, "usage-index.json");
const PROJECTS_DIR = path.join(os.homedir(), ".claude", "projects");
const MAX_LINE_PARSE = 400_000; // au-delà : extraction par regex uniquement
const SNIPPET_LEN = 140;

async function loadJson(f, d) {
  try { return JSON.parse(await fs.readFile(f, "utf-8")); } catch { return d; }
}
async function saveJson(f, o) {
  await fs.mkdir(path.dirname(f), { recursive: true });
  await fs.writeFile(f, JSON.stringify(o) + "\n", "utf-8");
}

function rxGet(line, key) {
  const m = line.match(new RegExp(`"${key}":"([^"]*)"`));
  return m ? m[1] : "";
}

function snippetFromUserLine(obj) {
  const c = obj?.message?.content;
  if (typeof c === "string") return c.slice(0, SNIPPET_LEN);
  if (Array.isArray(c)) {
    if (c.some((x) => x && x.type === "tool_result")) return null; // résultat d'outil, pas un vrai prompt
    const t = c.find((x) => x && x.type === "text" && typeof x.text === "string");
    if (t) return t.text.slice(0, SNIPPET_LEN);
  }
  return null;
}

async function scanFile(file) {
  const events = [];
  let lastUser = "";
  const rl = readline.createInterface({
    input: createReadStream(file, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line) continue;
    const hasSkill = line.includes('"name":"Skill"');
    const hasMcp = line.includes('"name":"mcp__');
    const hasCmd = line.includes("<command-name>");
    const isUser = line.includes('"type":"user"');
    if (!hasSkill && !hasMcp && !hasCmd && !isUser) continue;

    if (line.length > MAX_LINE_PARSE) {
      if (hasCmd) {
        const m = line.match(/<command-name>\/?([^<]{1,80})<\/command-name>/);
        if (m) events.push({ ts: rxGet(line, "timestamp"), kind: "command", name: m[1].trim(), sessionId: rxGet(line, "sessionId"), cwd: rxGet(line, "cwd"), snippet: "" });
      }
      continue;
    }
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    const base = { ts: obj.timestamp || "", sessionId: obj.sessionId || "", cwd: obj.cwd || "" };

    if (isUser && obj.type === "user") {
      const s = snippetFromUserLine(obj);
      if (s) lastUser = s;
      if (hasCmd) {
        const raw = typeof obj?.message?.content === "string" ? obj.message.content : JSON.stringify(obj?.message?.content || "");
        const m = raw.match(/<command-name>\/?([^<]{1,80})<\/command-name>/);
        if (m) events.push({ ...base, kind: "command", name: m[1].trim(), snippet: lastUser });
      }
    }
    if ((hasSkill || hasMcp) && obj.type === "assistant") {
      const content = obj?.message?.content;
      if (Array.isArray(content)) {
        for (const c of content) {
          if (!c || c.type !== "tool_use" || typeof c.name !== "string") continue;
          if (c.name === "Skill" && c.input?.skill) {
            events.push({ ...base, kind: "skill", name: String(c.input.skill), snippet: lastUser });
          } else if (c.name.startsWith("mcp__")) {
            events.push({ ...base, kind: "mcp", name: c.name, snippet: lastUser });
          }
        }
      }
    }
  }
  return events;
}

export async function scanUsage({ refresh = false, onProgress } = {}) {
  const index = refresh ? { files: {} } : await loadJson(USAGE_F, { files: {} });
  index.files = index.files || {};
  if (!existsSync(PROJECTS_DIR)) {
    index.generated_at = new Date().toISOString();
    await saveJson(USAGE_F, index);
    return index;
  }
  // liste des .jsonl (récursif : projets/<slug>/**/*.jsonl — sous-dossiers inclus)
  const files = [];
  const stack = [PROJECTS_DIR];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile() && e.name.endsWith(".jsonl")) files.push(p);
    }
  }
  const alive = new Set(files);
  for (const known of Object.keys(index.files)) {
    if (!alive.has(known)) delete index.files[known]; // transcript supprimé
  }
  let done = 0;
  for (const file of files) {
    done += 1;
    let st;
    try { st = await fs.stat(file); } catch { continue; }
    const prev = index.files[file];
    if (prev && prev.size === st.size && prev.mtimeMs === st.mtimeMs) continue; // inchangé
    const events = await scanFile(file);
    index.files[file] = { size: st.size, mtimeMs: st.mtimeMs, events };
    onProgress?.(done, files.length, path.basename(file));
  }
  index.generated_at = new Date().toISOString();
  await saveJson(USAGE_F, index);
  return index;
}

function mondayOf(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export async function readUsage({ refresh = false, name = "", weeks = 16 } = {}) {
  const index = await scanUsage({ refresh });
  const all = [];
  for (const f of Object.values(index.files)) for (const e of f.events || []) all.push(e);
  all.sort((a, b) => (a.ts < b.ts ? -1 : 1));

  if (name) {
    // drill-down : tous les évènements d'un outil précis (du + récent au + ancien)
    const q = name.toLowerCase();
    const events = all.filter((e) => e.name.toLowerCase() === q || e.name.toLowerCase().includes(q));
    return { name, total: events.length, events: events.reverse().slice(0, 200) };
  }

  const byName = {};
  for (const e of all) {
    const k = `${e.kind}:${e.name}`;
    const t = (byName[k] ||= { name: e.name, kind: e.kind, count: 0, first: e.ts, last: e.ts, sessions: new Set() });
    t.count += 1;
    if (e.ts && (!t.first || e.ts < t.first)) t.first = e.ts;
    if (e.ts && e.ts > t.last) t.last = e.ts;
    if (e.sessionId) t.sessions.add(e.sessionId);
  }
  const tools = Object.values(byName)
    .map((t) => ({ ...t, sessions: t.sessions.size }))
    .sort((a, b) => b.count - a.count);

  // activité par semaine (weeks dernières)
  const now = mondayOf(new Date());
  const buckets = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(start.getDate() - i * 7);
    buckets.push({ start: start.toISOString().slice(0, 10), skills: 0, mcp: 0, commands: 0 });
  }
  const first = new Date(buckets[0].start).getTime();
  for (const e of all) {
    if (!e.ts) continue;
    const t = new Date(e.ts).getTime();
    if (isNaN(t) || t < first) continue;
    const idx = Math.min(buckets.length - 1, Math.floor((t - first) / (7 * 86400000)));
    const b = buckets[idx];
    if (e.kind === "skill") b.skills += 1;
    else if (e.kind === "mcp") b.mcp += 1;
    else b.commands += 1;
  }

  return {
    generated_at: index.generated_at,
    totals: {
      events: all.length,
      skills: all.filter((e) => e.kind === "skill").length,
      mcp: all.filter((e) => e.kind === "mcp").length,
      commands: all.filter((e) => e.kind === "command").length,
      distinct_tools: tools.length,
      transcripts: Object.keys(index.files).length,
    },
    tools: tools.slice(0, 400),
    weeks: buckets,
  };
}
