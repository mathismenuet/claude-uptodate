// claude-uptodate — v0.4 Connexions
// Cartographie les MCP de TOUTES les familles (serveurs user Claude Code, MCP de
// plugins, connecteurs claude.ai, extensions desktop), leur ÉTAT réel
// (claude mcp list : connecté / auth requise / injoignable), les classe par
// catégorie d'usage, et propose l'action de reconnexion. Recense aussi les clés
// API (NOMS uniquement, jamais les valeurs) et les stacks Docker locales.
import { promises as fs, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DATA, sh } from "./core.mjs";
import { classify } from "./library.mjs";
import { pluginSourceIndex, resolveMcpSource } from "./sources.mjs";

const H = os.homedir();
const CONN_F = path.join(DATA, "connections.json");
const APPSUP = path.join(H, "Library", "Application Support", "Claude");

async function loadJson(f, d) {
  try { return JSON.parse(await fs.readFile(f, "utf-8")); } catch { return d; }
}
async function saveJson(f, o) {
  await fs.mkdir(path.dirname(f), { recursive: true });
  await fs.writeFile(f, JSON.stringify(o, null, 2) + "\n", "utf-8");
}

// ------------------------------------------------------------ familles MCP

async function userAndProjectServers() {
  const cfg = await loadJson(path.join(H, ".claude.json"), {});
  const out = [];
  for (const [name, s] of Object.entries(cfg.mcpServers || {})) {
    out.push({ name, family: "user", scope: "global", transport: s.type || (s.url ? "http" : "stdio"), detail: s.url || s.command || "" });
  }
  for (const [proj, p] of Object.entries(cfg.projects || {})) {
    for (const [name, s] of Object.entries(p.mcpServers || {})) {
      out.push({ name, family: "user", scope: proj, transport: s.type || (s.url ? "http" : "stdio"), detail: s.url || s.command || "" });
    }
  }
  return out;
}

async function desktopExtensions() {
  const dir = path.join(APPSUP, "Claude Extensions");
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (!e.isDirectory()) continue;
    // ids type "ant.dir.gh.canva.affinity" → label "affinity"
    const label = e.name.split(".").pop() || e.name;
    out.push({ name: label, family: "desktop-ext", scope: "app Claude", transport: "extension", detail: e.name });
  }
  return out;
}

async function needsAuthCache() {
  const cache = await loadJson(path.join(H, ".claude", "mcp-needs-auth-cache.json"), {});
  const claudeAi = [];
  const pluginsNeedingAuth = new Set();
  for (const key of Object.keys(cache)) {
    if (key.startsWith("claude.ai ")) claudeAi.push({ name: key.slice("claude.ai ".length), family: "claude.ai", scope: "claude.ai", transport: "connector", detail: cache[key]?.id || "" });
    else if (key.startsWith("plugin:")) pluginsNeedingAuth.add(key.slice("plugin:".length)); // "marketplace:Nom"
  }
  return { claudeAi, pluginsNeedingAuth };
}

// état réel : claude mcp list (health check ~10-60 s) — mis en cache
async function mcpListStatus() {
  const r = await sh("claude", ["mcp", "list"], { timeout: 240000 });
  const map = {};
  if (r.code !== 0 && !r.out) return { map, error: (r.err || "claude mcp list indisponible").slice(0, 200) };
  for (const line of r.out.split("\n")) {
    const m = line.match(/^(.+?):\s+(.+?)\s+-\s+(✓|!|✗)\s*(.*)$/);
    if (!m) continue;
    const [, name, detail, sym] = m;
    map[name.trim()] = {
      status: sym === "✓" ? "connected" : sym === "!" ? "needs-auth" : "failed",
      detail: detail.trim(),
    };
  }
  return { map };
}

function actionsFor(entry) {
  const A = [];
  if (entry.family === "claude.ai") {
    A.push({ kind: "link", label: "Reconnecter sur claude.ai", value: "https://claude.ai/settings/connectors" });
  } else if (entry.family === "desktop-ext") {
    A.push({ kind: "info", label: "App Claude → Réglages → Extensions", value: "" });
  } else if (entry.status === "needs-auth") {
    A.push({ kind: "command", label: "Terminal : claude puis /mcp → authentifier", value: "claude" });
  } else if (entry.status === "failed") {
    if (entry.transport === "stdio" && entry.detail) {
      A.push({ kind: "command", label: "Tester la commande du serveur", value: entry.detail });
    }
    A.push({ kind: "command", label: "Diagnostiquer : claude puis /mcp", value: "claude" });
  }
  return A;
}

export async function mcpReport({ withHealth = true } = {}) {
  const [user, ext, auth] = await Promise.all([userAndProjectServers(), desktopExtensions(), needsAuthCache()]);
  const entries = [...user, ...ext, ...auth.claudeAi];

  let health = { map: {} };
  if (withHealth) health = await mcpListStatus();

  // les MCP de plugins apparaissent dans claude mcp list sous "plugin:mkt:Nom"
  for (const [key, st] of Object.entries(health.map)) {
    if (key.startsWith("plugin:")) {
      const short = key.split(":").slice(2).join(":") || key;
      entries.push({ name: short, family: "plugin", scope: key.split(":")[1] || "", transport: st.detail.includes("(HTTP)") ? "http" : "stdio", detail: st.detail, status: st.status });
    }
  }
  const pluginIdx = await pluginSourceIndex();
  for (const e of entries) {
    if (!e.status) {
      const st = health.map[e.name] || health.map[`plugin:${e.scope}:${e.name}`];
      if (st) e.status = st.status;
      else if (e.family === "claude.ai") e.status = "needs-auth"; // présent dans le cache d'auth
      else if (e.family === "desktop-ext") e.status = "installed";
      else e.status = "unknown";
    }
    e.category = classify(e.name, e.detail || "");
    e.source = resolveMcpSource(e, pluginIdx);
    e.actions = actionsFor(e);
  }
  return { entries, health_error: health.error || null };
}

// ------------------------------------------------------------------ clés API

const KNOWN_KEYS = [
  { env: "FAL_KEY", label: "fal.ai", features: "Génération vidéo/image (Kling, FLUX…) — débloque le gros d'OpenMontage", url: "https://fal.ai/dashboard/keys" },
  { env: "REPLICATE_API_TOKEN", label: "Replicate", features: "Modèles vidéo/image alternatifs", url: "https://replicate.com/account/api-tokens" },
  { env: "ELEVENLABS_API_KEY", label: "ElevenLabs", features: "Voix off premium, clonage, SFX", url: "https://elevenlabs.io/app/settings/api-keys" },
  { env: "OPENAI_API_KEY", label: "OpenAI", features: "GPT/TTS/images (certains outils)", url: "https://platform.openai.com/api-keys" },
  { env: "ANTHROPIC_API_KEY", label: "Anthropic", features: "API Claude (scripts hors Claude Code)", url: "https://console.anthropic.com/settings/keys" },
  { env: "GEMINI_API_KEY", label: "Google Gemini", features: "Génération Gemini/Veo/Imagen", url: "https://aistudio.google.com/apikey" },
  { env: "GOOGLE_API_KEY", label: "Google Cloud", features: "TTS Google, APIs Google", url: "https://console.cloud.google.com/apis/credentials" },
  { env: "AZURE_SPEECH_KEY", label: "Azure Speech", features: "STT Azure (OpenMontage azure_stt)", url: "https://portal.azure.com" },
  { env: "HF_TOKEN", label: "Hugging Face", features: "Modèles/datasets HF", url: "https://huggingface.co/settings/tokens" },
  { env: "RESEND_API_KEY", label: "Resend", features: "Envoi d'emails (templates next-app)", url: "https://resend.com/api-keys" },
  { env: "EXA_API_KEY", label: "Exa", features: "Recherche web agent-reach", url: "https://dashboard.exa.ai/api-keys" },
  { env: "JINA_API_KEY", label: "Jina", features: "Lecture de pages agent-reach", url: "https://jina.ai/api-dashboard" },
  { env: "FIRECRAWL_API_KEY", label: "Firecrawl", features: "Scraping (skill firecrawl-web)", url: "https://www.firecrawl.dev/app/api-keys" },
  { env: "TAVILY_API_KEY", label: "Tavily", features: "Recherche web outils agents", url: "https://app.tavily.com" },
  { env: "DEEPGRAM_API_KEY", label: "Deepgram", features: "Transcription temps réel", url: "https://console.deepgram.com" },
  { env: "GITHUB_TOKEN", label: "GitHub (token env)", features: "API GitHub hors gh CLI", url: "https://github.com/settings/tokens" },
];

async function exportedNames(file) {
  try {
    const txt = await fs.readFile(file, "utf-8");
    const names = new Set();
    for (const m of txt.matchAll(/^\s*export\s+([A-Z][A-Z0-9_]+)=/gm)) names.add(m[1]);
    return names;
  } catch { return new Set(); }
}

export async function apiKeysReport() {
  const sources = {
    "~/.zshrc": await exportedNames(path.join(H, ".zshrc")),
    "~/.zshenv": await exportedNames(path.join(H, ".zshenv")),
    "~/.zprofile": await exportedNames(path.join(H, ".zprofile")),
  };
  const settings = await loadJson(path.join(H, ".claude", "settings.json"), {});
  const settingsEnv = new Set(Object.keys(settings.env || {}));
  const openmontageEnv = new Set();
  // .env d'OpenMontage (noms seulement) — c'est LA conso d'API vidéo de Mathis
  for (const p of ["Pro/2026.07.16 OpenMontage/.env"]) {
    const f = path.join(H, "Downloads", "VibeCoding", p);
    try {
      const txt = await fs.readFile(f, "utf-8");
      for (const m of txt.matchAll(/^\s*([A-Z][A-Z0-9_]+)\s*=/gm)) openmontageEnv.add(m[1]);
    } catch { /* absent */ }
  }

  const rows = KNOWN_KEYS.map((k) => {
    const where = [];
    for (const [src, set] of Object.entries(sources)) if (set.has(k.env)) where.push(src);
    if (settingsEnv.has(k.env)) where.push("~/.claude/settings.json");
    if (openmontageEnv.has(k.env)) where.push("OpenMontage/.env");
    if (process.env[k.env]) where.push("session");
    return { ...k, defined: where.length > 0, where };
  });
  // clés exportées mais inconnues de la table (info)
  const extra = new Set();
  for (const set of [...Object.values(sources), settingsEnv, openmontageEnv]) {
    for (const n of set) {
      if (/(_API_KEY|_TOKEN|_SECRET|_KEY)$/.test(n) && !KNOWN_KEYS.some((k) => k.env === n)) extra.add(n);
    }
  }
  return { rows, extra: [...extra].sort() };
}

// ------------------------------------------------------------------- docker

export async function dockerReport() {
  const r = await sh("docker", ["ps", "--format", "{{json .}}"], { timeout: 20000 });
  if (r.code !== 0) return { available: false, error: (r.err || "docker indisponible").slice(0, 120), projects: [] };
  const byProject = {};
  for (const line of r.out.split("\n").filter(Boolean)) {
    let c;
    try { c = JSON.parse(line); } catch { continue; }
    const labels = String(c.Labels || "");
    const pm = labels.match(/com\.docker\.compose\.project=([^,]+)/);
    const project = pm ? pm[1] : "(hors compose)";
    (byProject[project] ||= []).push({ name: c.Names, image: c.Image, status: c.Status, ports: c.Ports || "" });
  }
  const projects = Object.entries(byProject).map(([project, containers]) => ({
    project,
    containers,
    update_hint: project === "(hors compose)" ? "docker pull <image>" : `cd <dossier du compose> && docker compose pull && docker compose up -d`,
  }));
  return { available: true, projects };
}

// ------------------------------------------------------------------ rapport

export async function connectionsReport({ refresh = false, withHealth = true } = {}) {
  if (!refresh) {
    const cached = await loadJson(CONN_F, null);
    // cache 30 min — claude mcp list est lent
    if (cached && Date.now() - new Date(cached.generated_at).getTime() < 30 * 60 * 1000) return cached;
  }
  const [mcp, apiKeys, docker] = await Promise.all([
    mcpReport({ withHealth }),
    apiKeysReport(),
    dockerReport(),
  ]);
  const report = {
    generated_at: new Date().toISOString(),
    mcp: mcp.entries,
    health_error: mcp.health_error,
    apiKeys,
    docker,
  };
  await saveJson(CONN_F, report);
  return report;
}
