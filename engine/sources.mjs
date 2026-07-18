// claude-uptodate — resolveur de SOURCE (remonter a l'origine de chaque outil)
// Pour un skill, un plugin ou un MCP, retourne { repo?, homepage?, npm?, endpoint? }
// afin d'afficher des liens cliquables "Repo GitHub" et "Site". Zero dependance.
import { promises as fs, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const H = os.homedir();
const MARKETPLACES = path.join(H, ".claude", "plugins", "marketplaces");

async function loadJson(f, d) {
  try { return JSON.parse(await fs.readFile(f, "utf-8")); } catch { return d; }
}

export function normRepo(url) {
  if (!url) return null;
  const m = /github\.com[:/]+([^/\s]+)\/([^/\s]+?)(?:\.git)?(?:[/#?].*)?$/.exec(url);
  return m ? `https://github.com/${m[1]}/${m[2]}` : (/^https?:\/\//.test(url) ? url : null);
}

export function fromHttpUrl(url) {
  try {
    const u = new URL(url);
    return { homepage: `${u.protocol}//${u.host}`, endpoint: url };
  } catch { return {}; }
}

// commande stdio type "npx -y @scope/pkg@latest --mcp" -> package npm
export function fromCommand(detail) {
  if (!detail) return {};
  const toks = String(detail).split(/\s+/);
  const i = toks.findIndex((t) => t === "npx" || t.endsWith("/npx"));
  if (i === -1) return {};
  const pkgTok = toks.slice(i + 1).find((t) => t && !t.startsWith("-"));
  if (!pkgTok) return {};
  const pkg = pkgTok.replace(/@(latest|[\d.]+)$/, "");
  return { npm: `https://www.npmjs.com/package/${pkg}`, pkg };
}

// MCP bien connus : repo/site surs (le reste est derive de l'URL/commande)
export const CURATED_MCP = {
  context7: { repo: "https://github.com/upstash/context7", homepage: "https://context7.com" },
  repomix: { repo: "https://github.com/yamadashy/repomix", homepage: "https://repomix.com" },
  elevenlabs: { repo: "https://github.com/elevenlabs/elevenlabs-mcp", homepage: "https://elevenlabs.io" },
  render: { repo: "https://github.com/render-oss/render-mcp-server", homepage: "https://render.com" },
  magic: { repo: "https://github.com/21st-dev/magic-mcp", homepage: "https://21st.dev" },
  higgsfield: { homepage: "https://higgsfield.ai" },
  photoshop: { homepage: "https://www.adobe.com/products/photoshop.html" },
  lightroom: { homepage: "https://www.adobe.com/products/photoshop-lightroom.html" },
  whatsapp: { repo: "https://github.com/lharries/whatsapp-mcp", homepage: "https://www.whatsapp.com" },
  telegram: { homepage: "https://telegram.org" },
  "mcp-pinterest": { homepage: "https://www.pinterest.com" },
  vercel: { repo: "https://github.com/vercel/mcp-adapter", homepage: "https://vercel.com" },
  github: { repo: "https://github.com/github/github-mcp-server", homepage: "https://github.com" },
  notebooklm: { repo: "https://github.com/teng-lin/notebooklm-py", homepage: "https://notebooklm.google.com" },
  fillout: { homepage: "https://www.fillout.com" },
  engram: { homepage: "https://engram.sh" },
  "lottiefiles-creator": { homepage: "https://lottiefiles.com" },
  "lottiefiles-search": { homepage: "https://lottiefiles.com" },
  Descrybe: { homepage: "https://descrybe.ai" },
  Linear: { homepage: "https://linear.app" },
  Atlassian: { homepage: "https://www.atlassian.com" },
  Asana: { homepage: "https://asana.com" },
  Calendly: { homepage: "https://calendly.com" },
  Strava: { homepage: "https://www.strava.com" },
  Indeed: { homepage: "https://www.indeed.com" },
  DocuSign: { homepage: "https://www.docusign.com" },
  Slack: { homepage: "https://slack.com" },
  "Google Drive": { homepage: "https://drive.google.com" },
  Box: { homepage: "https://www.box.com" },
  // extensions desktop Anthropic
  "chrome-control": { repo: "https://github.com/anthropics/anthropic-quickstarts", homepage: "https://claude.com" },
  filesystem: { repo: "https://github.com/modelcontextprotocol/servers", homepage: "https://modelcontextprotocol.io" },
  imessage: { homepage: "https://claude.com" },
  ms_office_powerpoint: { homepage: "https://www.microsoft.com/microsoft-365/powerpoint" },
  "pdf-server-mcp": { homepage: "https://modelcontextprotocol.io" },
  affinity: { homepage: "https://affinity.serif.com" },
  "revolut-x-api": { homepage: "https://www.revolut.com" },
};

// Index des sources de plugins, construit une fois depuis tous les plugin.json.
// Cle = nom du plugin ; valeur = { repo, homepage, marketplace }.
let _pluginIdx = null;
export async function pluginSourceIndex({ refresh = false } = {}) {
  if (_pluginIdx && !refresh) return _pluginIdx;
  const byPlugin = {};
  const byMarketplace = {};
  if (existsSync(MARKETPLACES)) {
    for (const mkt of await fs.readdir(MARKETPLACES, { withFileTypes: true }).catch(() => [])) {
      if (!mkt.isDirectory()) continue;
      const mroot = path.join(MARKETPLACES, mkt.name);
      const mkConfig = await loadJson(path.join(mroot, ".claude-plugin", "marketplace.json"), null);
      byMarketplace[mkt.name] = { owner: mkConfig?.owner?.url || null };
      const stack = [mroot];
      let guard = 0;
      while (stack.length && guard++ < 6000) {
        const dir = stack.pop();
        for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
          if (e.name === "node_modules" || (e.name.startsWith(".") && e.name !== ".claude-plugin")) continue;
          const p = path.join(dir, e.name);
          if (e.isDirectory()) stack.push(p);
          else if (e.name === "plugin.json" && dir.endsWith(".claude-plugin")) {
            const pj = await loadJson(p, {});
            if (pj.name) {
              const repoRaw = pj.repository?.url || pj.repository || pj.homepage;
              const homeRaw = (typeof pj.homepage === "string" && !/github\.com/.test(pj.homepage))
                ? pj.homepage
                : (pj.author?.url && !/github\.com/.test(pj.author.url) ? pj.author.url : null);
              byPlugin[pj.name] = { repo: normRepo(repoRaw), homepage: homeRaw, marketplace: mkt.name };
            }
          }
        }
      }
    }
  }
  _pluginIdx = { byPlugin, byMarketplace };
  return _pluginIdx;
}

// Source d'un MCP (family user/plugin/claude.ai/desktop-ext)
export function resolveMcpSource(entry, pluginIdx) {
  const out = {};
  const cur = CURATED_MCP[entry.name];
  if (cur) Object.assign(out, cur);
  if (entry.family === "plugin" && pluginIdx?.byPlugin?.[entry.name]) {
    const hit = pluginIdx.byPlugin[entry.name];
    out.repo = out.repo || hit.repo;
    out.homepage = out.homepage || hit.homepage;
  }
  const d = entry.detail || "";
  const urlMatch = d.match(/https?:\/\/[^\s)]+/);
  if (urlMatch) {
    const h = fromHttpUrl(urlMatch[0]);
    out.homepage = out.homepage || h.homepage;
    out.endpoint = out.endpoint || h.endpoint;
  } else if (d.includes("npx")) {
    const n = fromCommand(d);
    if (n.npm) out.npm = out.npm || n.npm;
  }
  return Object.keys(out).length ? out : null;
}

// Cherche le plugin.json le plus proche en remontant depuis un dossier de skill
export async function nearestPluginJson(startDir, stopDir) {
  let dir = startDir;
  for (let i = 0; i < 8; i++) {
    const pj = path.join(dir, ".claude-plugin", "plugin.json");
    if (existsSync(pj)) return await loadJson(pj, null);
    if (dir === stopDir || dir === path.dirname(dir)) break;
    dir = path.dirname(dir);
  }
  return null;
}
