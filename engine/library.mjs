// claude-uptodate — M2 Bibliothèque
// Scanne TOUT l'outillage IA de la machine (skills Claude locaux, agents-CLI,
// marketplaces de plugins, Codex, Gemini), le classe par typologie d'usage et
// produit library.json : la carte mentale visuelle de "qu'est-ce que je possède,
// et quand y penser". Zéro dépendance.
import { promises as fs, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DATA, sh, githubSlug } from "./core.mjs";
import { nearestPluginJson, normRepo } from "./sources.mjs";

const LIBRARY_F = path.join(DATA, "library.json");
const OVERRIDES_F = path.join(DATA, "library-overrides.json");
const BASKETS_F = path.join(DATA, "baskets.json");

const home = (p) => p.replace(/^~(?=$|\/)/, os.homedir());

// ---------------------------------------------------------------- taxonomie

export const CATEGORIES = [
  { id: "video", label: "Vidéo & Montage", emoji: "🎬", kw: ["video", "vidéo", "montage", "remotion", "ffmpeg", "final-cut", "fcpx", "davinci", "clip", "trailer", "footage", "capcut", "editing", "subtitle", "sous-titr", "b-roll", "reels script", "shorts", "avatar", "lip-sync", "dubbing", "hyperframes", "manim", "animation", "animate", "motion", "lottie", "timelapse", "screen record", "demo video", "heygen", "kling", "seedance", "veo", "backlot"] },
  { id: "audio", label: "Audio & Voix", emoji: "🎙", kw: ["audio", "voice", "voix", "tts", "text-to-speech", "speech-to-text", "transcri", "whisper", "music", "musique", "sound", "sfx", "elevenlabs", "podcast", "dub", "acestep"] },
  { id: "image", label: "Images & Photo", emoji: "🖼", kw: ["image", "photo", "flux", "imagen", "midjourney", "upscale", "background", "retouch", "lightroom", "photoshop", "thumbnail", "miniature", "banner", "logo", "svg", "illustration", "ink", "drawing", "faceswap", "portrait"] },
  { id: "design", label: "Design & UI", emoji: "🎨", kw: ["design", "ui", "ux", "figma", "tailwind", "css", "gsap", "framer-motion", "animejs", "frontend", "landing", "brutalist", "minimalist", "brand", "theme", "visual", "wireframe", "mockup", "canvas", "web-design", "shadcn", "three", "webgl", "typegpu", "waapi"] },
  { id: "web", label: "Sites & Apps (dev)", emoji: "🌐", kw: ["next", "nextjs", "react", "vue", "nuxt", "vite", "typescript", "javascript", "node", "api", "backend", "fullstack", "deploy", "vercel", "supabase", "database", "sql", "docker", "kubernetes", "terraform", "app", "site", "website", "swift", "ios", "mobile", "playwright", "test", "e2e", "debug", "refactor", "code review", "architecture", "monorepo", "ci-cd", "git ", "pnpm", "eslint"] },
  { id: "social", label: "Contenu & Réseaux sociaux", emoji: "📱", kw: ["social", "instagram", "reels", "tiktok", "youtube", "twitter", "linkedin", "post", "hook", "caption", "carousel", "newsletter", "content", "contenu", "viral", "engagement", "audience", "influenc", "pinterest", "thread"] },
  { id: "seo", label: "SEO & Visibilité", emoji: "📈", kw: ["seo", "search engine", "keyword", "backlink", "sitemap", "schema", "serp", "ranking", "google business", "local search", "aeo", "geo", "llms.txt", "programmatic"] },
  { id: "marketing", label: "Marketing & Croissance", emoji: "🚀", kw: ["marketing", "ads", "campaign", "campagne", "copywriting", "cro", "conversion", "funnel", "launch", "growth", "a/b test", "email sequence", "paywall", "pricing", "referral", "aso", "psychology", "positioning", "brand voice"] },
  { id: "vente", label: "Vente & Prospection", emoji: "🎯", kw: ["prospect", "cold email", "cold-email", "lead", "outreach", "sales", "vente", "crm", "hubspot", "pipeline", "deal", "client", "account research", "forecast", "rfp", "proposal", "scraping", "maps", "commercial"] },
  { id: "business", label: "Business & Stratégie", emoji: "💼", kw: ["business", "strategy", "stratégie", "ceo", "cfo", "founder", "startup", "product-market", "roadmap", "okr", "board", "pitch", "investor", "competitive", "market research", "pmf", "advisor", "c-level", "executive", "operations", "vendor", "procurement", "capacity"] },
  { id: "admin", label: "Finance & Admin", emoji: "🧾", kw: ["facture", "invoice", "comptab", "accounting", "fiscal", "tax", "impôt", "payroll", "expense", "devis", "notaire", "syndic", "reconcil", "ledger", "close", "audit", "variance", "banking", "budget"] },
  { id: "legal", label: "Juridique", emoji: "⚖️", kw: ["legal", "juridique", "contract", "contrat", "nda", "compliance", "gdpr", "dsgvo", "privacy", "litigation", "patent", "trademark", "ip ", "clause", "counsel", "law", "regulatory", "employment law"] },
  { id: "recherche", label: "Recherche & Veille", emoji: "🔍", kw: ["research", "recherche", "veille", "search", "scrape", "crawl", "browse", "fetch", "web search", "reddit", "hacker news", "trends", "pulse", "dossier", "literature", "grants", "syllabus", "consensus", "arxiv", "wiki", "knowledge", "notebooklm", "summar", "digest", "monitor"] },
  { id: "docs", label: "Documents & Bureautique", emoji: "📄", kw: ["docx", "word", "pdf", "pptx", "powerpoint", "slides", "présentation", "excel", "xlsx", "spreadsheet", "notion", "confluence", "document", "report", "rapport", "memo", "letter", "template", "form"] },
  { id: "data", label: "Data & Analyse", emoji: "📊", kw: ["data", "analytics", "dashboard", "visualization", "dataviz", "chart", "graph", "statistic", "bigquery", "python", "notebook", "etl", "pipeline data", "metrics", "kpi", "d3"] },
  { id: "productivite", label: "Productivité & Orga", emoji: "✅", kw: ["email", "inbox", "calendar", "calendly", "meeting", "réunion", "task", "todo", "planning", "schedule", "reminder", "note", "capture", "brain", "memory", "handoff", "workflow", "automation", "n8n", "zapier", "imessage", "whatsapp", "telegram", "slack"] },
  { id: "meta", label: "Méta & Outillage IA", emoji: "🧠", kw: ["skill", "plugin", "mcp", "agent", "claude", "prompt", "llm", "gpt", "gemini", "codex", "orchestrat", "subagent", "superpower", "brainstorm", "plan mode", "context", "token", "eval", "benchmark", "install", "setup", "config", "uptodate", "radar", "graphify", "repomix"] },
];

// « Quand y penser » par défaut, par catégorie (surchargé par CURATED puis overrides.json)
const WHEN_BY_CAT = {
  video: "Dès qu'il faut produire, monter, sous-titrer ou dériver une vidéo.",
  audio: "Voix off, transcription, musique ou nettoyage audio.",
  image: "Créer, retoucher ou décliner un visuel/photo.",
  design: "Interface, animation web, identité visuelle, landing.",
  web: "Coder, tester, déployer un site ou une app.",
  social: "Poster, scripter ou recycler du contenu pour les réseaux.",
  seo: "Être trouvé sur Google/IA : audit, contenus, schema.",
  marketing: "Faire connaître une offre, convertir, lancer.",
  vente: "Trouver des clients, préparer un rdv, relancer, closer.",
  business: "Décision stratégique, offre, organisation, pilotage.",
  admin: "Factures, compta, fiscal, paperasse.",
  legal: "Contrats, conformité, questions juridiques.",
  recherche: "Comprendre un sujet, surveiller le web, sourcer.",
  docs: "Produire un livrable Word/PDF/slides/tableur propre.",
  data: "Explorer des données, produire un dashboard/graphe.",
  productivite: "Emails, agenda, tâches, mémoire, automatisations.",
  meta: "Gérer, créer ou améliorer l'outillage IA lui-même.",
  autres: "",
};

// Annotations soignées pour les outils clés du propriétaire (priorité max)
export const CURATED = {
  "final-cut-pro": { category: "video", when: "Montage client dans Final Cut : FCPXML, organisation de projet, exports." },
  "remotion-best-practices": { category: "video", when: "Toute composition vidéo en React/Remotion (OpenMontage compris)." },
  "video-transcript": { category: "audio", when: "Tirer le texte d'une vidéo avant découpe ou repurposing." },
  "prospecting": { category: "vente", when: "Chercher tes premiers clients : signaux de demande, ciblage local." },
  "cold-email": { category: "vente", when: "Écrire/structurer une séquence d'emails froids qui répond." },
  "sales-enablement": { category: "vente", when: "Préparer argumentaires et assets avant un rdv client." },
  "lead-magnets": { category: "marketing", when: "Créer un aimant à leads (checklist, mini-outil) pour capter des emails." },
  "dossier": { category: "recherche", when: "Dossier décisionnel complet sur un prospect/partenaire avant contact." },
  "pulse": { category: "recherche", when: "Prendre le pouls multi-plateformes (Reddit/HN/web) d'un sujet récent." },
  "agent-browser": { category: "recherche", when: "Automatiser un parcours web (headless) pour vérifier ou extraire." },
  "graphify": { category: "meta", when: "Transformer n'importe quel contenu en graphe de connaissances." },
  "find-skills": { category: "meta", when: "Chercher s'il existe déjà un skill pour une tâche avant de bricoler." },
  "repo-radar": { category: "meta", when: "Vérifier les mises à jour de tes repos/skills/plugins (cet outil !)." },
  "gsap": { category: "design", when: "Animations web riches (scroll, timeline, morph) sur un site." },
  "frontend-design": { category: "design", when: "Donner une vraie direction artistique à une interface web." },
  "comptable": { category: "admin", when: "Question compta/TVA/facturation de ton activité." },
  "social-reels-scripting": { category: "social", when: "Scripter un Reel : hook, structure, CTA." },
  "social-youtube-thumbnail": { category: "image", when: "Concevoir une miniature qui clique." },
  "marketing-psychology": { category: "marketing", when: "Appliquer les biais/principes psy à une page ou une offre." },
  "seo-local": { category: "seo", when: "Visibilité Google Maps/locale d'un commerce (offre parfaite post-scraping)." },
  "youtube-downloader": { category: "video", when: "Récupérer une vidéo/un audio source avant analyse ou montage." },
  "baoyu-youtube-transcript": { category: "recherche", when: "Transcript YouTube rapide pour veille sans regarder." },
  "notebooklm": { category: "recherche", when: "Envoyer un corpus dans NotebookLM et en tirer podcast/synthèses." },
  "humanizer": { category: "marketing", when: "Rendre un texte IA naturel avant publication." },
  "invoice-chase": { category: "admin", when: "Relancer les factures impayées clients." },
  "browse": { category: "recherche", when: "Navigation web headless (gstack) pour recherche et QA." },
  "playwright": { category: "web", when: "Tests E2E ou automatisation d'un vrai navigateur." },
  "ffmpeg": { category: "video", when: "Toute manipulation fichier vidéo/audio en ligne de commande." },
  "elevenlabs": { category: "audio", when: "Voix off réaliste, clonage, sound design via ElevenLabs." },
  "text-to-speech": { category: "audio", when: "Choisir/appeler le bon fournisseur TTS pour une narration." },
  "speech-to-text": { category: "audio", when: "Transcrire rushs/interviews (Whisper local par défaut)." },
};

// ------------------------------------------------------------------ helpers

async function loadJson(f, d) {
  try { return JSON.parse(await fs.readFile(f, "utf-8")); } catch { return d; }
}
async function saveJson(f, o) {
  await fs.mkdir(path.dirname(f), { recursive: true });
  await fs.writeFile(f, JSON.stringify(o, null, 2) + "\n", "utf-8");
}

async function parseFrontmatter(file) {
  let txt;
  try {
    const fh = await fs.open(file, "r");
    const buf = Buffer.alloc(8192);
    const { bytesRead } = await fh.read(buf, 0, 8192, 0);
    await fh.close();
    txt = buf.slice(0, bytesRead).toString("utf-8");
  } catch { return {}; }
  const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const fm = m[1];
  const get = (key) => {
    const r = fm.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
    if (!r) return "";
    let val = r[1].trim();
    if (val === "|" || val === ">" || val === "") {
      // bloc multi-lignes : prendre les lignes indentées suivantes
      const start = fm.indexOf(r[0]) + r[0].length;
      const lines = [];
      for (const line of fm.slice(start).split("\n")) {
        if (/^\s+\S/.test(line)) lines.push(line.trim());
        else if (line.trim() === "") continue;
        else break;
      }
      val = lines.join(" ");
    }
    return val.replace(/^["']|["']$/g, "");
  };
  return { name: get("name"), description: get("description") };
}

export function classify(name, description) {
  const hay = `${name} ${description}`.toLowerCase();
  const lowName = name.toLowerCase();
  let best = "autres";
  let bestScore = 0;
  for (const cat of CATEGORIES) {
    let score = 0;
    for (const kw of cat.kw) {
      if (hay.includes(kw)) score += kw.length > 6 ? 2 : 1;
      if (lowName.includes(kw)) score += 2; // le nom pèse double
    }
    if (score > bestScore) { bestScore = score; best = cat.id; }
  }
  return bestScore > 0 ? best : "autres";
}

function firstSentence(s, max = 180) {
  if (!s) return "";
  const cut = s.split(/(?<=[.!?])\s/)[0] || s;
  return cut.length > max ? cut.slice(0, max - 1) + "…" : cut;
}

// --------------------------------------------------------------------- scan

async function* walkSkillFiles(root, maxdepth = 6) {
  const stack = [[root, 0]];
  while (stack.length) {
    const [dir, depth] = stack.pop();
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory() && depth < maxdepth) stack.push([p, depth + 1]);
      else if (e.isFile() && e.name === "SKILL.md") yield p;
    }
  }
}

export async function libraryScan() {
  const entries = [];
  const seen = new Set(); // realpath dedupe
  const mktRoot = (mkt) => path.join(home("~/.claude/plugins/marketplaces"), mkt);
  const mktRemoteCache = {};
  async function marketplaceSource(mkt) {
    if (mktRemoteCache[mkt] !== undefined) return mktRemoteCache[mkt];
    const { out } = await sh("git", ["-C", mktRoot(mkt), "remote", "get-url", "origin"], { timeout: 8000 });
    const slug = githubSlug(out);
    mktRemoteCache[mkt] = slug ? { repo: `https://github.com/${slug}` } : null;
    return mktRemoteCache[mkt];
  }
  // lock npx-skills : name -> sourceUrl (repo d'origine du skill)
  const lockMap = {};
  for (const [n, e] of Object.entries((await loadJson(home("~/.agents/.skill-lock.json"), {})).skills || {})) {
    if (e.sourceUrl || e.source) lockMap[n] = e.sourceUrl || e.source;
  }

  async function resolveSource(dir, surface, container, name) {
    // 0) orphelin déjà mappé manuellement à sa source
    if (mapping[name]?.slug) return { repo: `https://github.com/${mapping[name].slug}` };
    // 1) skill géré par npx-skills → repo du lock
    if (lockMap[name]) return { repo: normRepo(lockMap[name]) };
    // 2) skill de marketplace → plugin.json le plus proche, sinon remote de la marketplace
    if (container.startsWith("marketplace:")) {
      const mkt = container.slice("marketplace:".length);
      const pj = await nearestPluginJson(dir, mktRoot(mkt));
      if (pj) {
        const repo = normRepo(pj.repository?.url || pj.repository || pj.homepage);
        const homepage = (typeof pj.homepage === "string" && !/github\.com/.test(pj.homepage)) ? pj.homepage
          : (pj.author?.url && !/github\.com/.test(pj.author.url) ? pj.author.url : null);
        if (repo || homepage) return { repo, homepage };
      }
      return (await marketplaceSource(mkt)) || {};
    }
    // 3) skill user cloné en git → remote origin
    if (existsSync(path.join(dir, ".git"))) {
      const { out } = await sh("git", ["-C", dir, "remote", "get-url", "origin"], { timeout: 8000 });
      const slug = githubSlug(out);
      if (slug) return { repo: `https://github.com/${slug}` };
    }
    return {};
  }

  async function addSkill(skillFile, surface, container, invocationHint) {
    let real;
    try { real = await fs.realpath(skillFile); } catch { real = skillFile; }
    if (seen.has(real)) return;
    seen.add(real);
    const dir = path.dirname(skillFile);
    let installedAt = null;
    try { installedAt = (await fs.stat(dir)).birthtime.toISOString(); } catch { /* n/a */ }
    const fm = await parseFrontmatter(skillFile);
    const name = fm.name || path.basename(dir);
    const description = firstSentence(fm.description);
    const category = CURATED[name]?.category || classify(name, fm.description || "");
    const source = await resolveSource(dir, surface, container, name);
    entries.push({
      id: `${surface}:${container}:${name}:${entries.length}`,
      type: "skill",
      name,
      surface,
      container,
      path: dir,
      installed_at: installedAt,
      description,
      category,
      when: CURATED[name]?.when || WHEN_BY_CAT[category] || "",
      curated: !!CURATED[name],
      invocation: invocationHint(name),
      source,
    });
  }

  // 1) Skills Claude « user » (~/.claude/skills, ~/.agents/skills — dédupliqués)
  for (const sd of ["~/.claude/skills", "~/.agents/skills"]) {
    const dir = home(sd);
    if (!existsSync(dir)) continue;
    for (const child of await fs.readdir(dir, { withFileTypes: true })) {
      if (!child.isDirectory() || child.name.startsWith(".")) continue;
      const f = path.join(dir, child.name, "SKILL.md");
      if (existsSync(f)) await addSkill(f, "claude", "user", (n) => `/${n}`);
    }
  }

  // 2) Marketplaces de plugins Claude (tout le catalogue disponible)
  const mp = home("~/.claude/plugins/marketplaces");
  if (existsSync(mp)) {
    for (const m of await fs.readdir(mp, { withFileTypes: true })) {
      if (!m.isDirectory()) continue;
      const mroot = path.join(mp, m.name);
      for await (const f of walkSkillFiles(mroot)) {
        const rel = path.relative(mroot, f).split(path.sep);
        // heuristique nom de plugin : segment avant "skills", sinon 1er segment utile
        let plugin = m.name;
        const iSkills = rel.indexOf("skills");
        if (iSkills > 0) plugin = rel[iSkills - 1];
        else if (rel.length > 2) plugin = rel[0] === "plugins" ? rel[1] : rel[0];
        await addSkill(f, "claude", `marketplace:${m.name}`, (n) =>
          plugin && plugin !== m.name ? `${plugin}:${n}` : n);
      }
    }
  }

  // 3) Autres surfaces LLM (Codex, Gemini/Antigravity)
  async function addSkillLoose(dir, surface, inv) {
    let real;
    try { real = await fs.realpath(dir); } catch { real = dir; }
    if (seen.has(real)) return;
    seen.add(real);
    const name = path.basename(dir);
    let installedAt = null;
    try { installedAt = (await fs.stat(dir)).birthtime.toISOString(); } catch { /* n/a */ }
    const category = CURATED[name]?.category || classify(name, "");
    const source = await resolveSource(dir, surface, "user", name);
    entries.push({
      id: `${surface}:user:${name}:${entries.length}`, type: "skill", name, surface,
      container: "user", path: dir, installed_at: installedAt, description: "", category,
      when: CURATED[name]?.when || WHEN_BY_CAT[category] || "",
      curated: !!CURATED[name], invocation: inv(name), source,
    });
  }
  const surfaces = [
    { id: "codex", dir: "~/.codex/skills", inv: (n) => `Codex → skill ${n}` },
    { id: "gemini", dir: "~/.gemini/skills", inv: (n) => `Gemini/Antigravity → skill ${n}` },
  ];
  for (const s of surfaces) {
    const dir = home(s.dir);
    if (!existsSync(dir)) continue;
    for (const child of await fs.readdir(dir, { withFileTypes: true })) {
      if (!child.isDirectory() || child.name.startsWith(".")) continue;
      const f = path.join(dir, child.name, "SKILL.md");
      if (existsSync(f)) await addSkill(f, s.id, "user", s.inv);
      else await addSkillLoose(path.join(dir, child.name), s.id, s.inv);
    }
  }

  // Surcouches utilisateur (corrections manuelles persistantes)
  const overrides = await loadJson(OVERRIDES_F, {});
  for (const e of entries) {
    const o = overrides[e.name];
    if (o) Object.assign(e, o, { curated: true });
  }

  const stats = {};
  for (const e of entries) stats[e.category] = (stats[e.category] || 0) + 1;

  const library = {
    generated_at: new Date().toISOString(),
    count: entries.length,
    categories: CATEGORIES.map((c) => ({ id: c.id, label: c.label, emoji: c.emoji, count: stats[c.id] || 0 }))
      .concat([{ id: "autres", label: "À classer", emoji: "❓", count: stats.autres || 0 }]),
    entries: entries.sort((a, b) => a.name.localeCompare(b.name)),
  };
  await saveJson(LIBRARY_F, library);
  await ensureDefaultBaskets();
  return library;
}

// ------------------------------------------------------------------ paniers

const DEFAULT_BASKETS = [
  { id: "video-client", emoji: "🎬", label: "Créer une vidéo client", match: ["final-cut-pro", "remotion", "ffmpeg", "elevenlabs", "text-to-speech", "speech-to-text", "music", "video-edit", "video-transcript", "video_toolkit", "avatar-video", "sound-effects"] },
  { id: "prospection", emoji: "🎯", label: "Prospection locale", match: ["prospecting", "cold-email", "dossier", "lead-magnets", "sales-enablement", "seo-local", "seo-maps", "account-research", "draft-outreach", "call-prep", "lead-triage"] },
  { id: "site-client", emoji: "🌐", label: "Lancer un site client", match: ["frontend-design", "gsap", "tailwind", "design-system", "vercel", "nextjs", "landing", "seo-audit", "web-design-guidelines", "framer-motion"] },
  { id: "contenu-ig", emoji: "📱", label: "Contenu Instagram/Reels", match: ["social-reels-scripting", "social-hook-generator", "social-post-writer", "social-youtube-thumbnail", "social-content-matrix", "agent-reach", "virality", "baoyu-youtube-transcript", "humanizer"] },
  { id: "veille", emoji: "🔍", label: "Veille & recherche", match: ["pulse", "research", "agent-reach", "browse", "scrape", "notebooklm", "repomix", "firecrawl-web", "llm-wiki"] },
  { id: "admin", emoji: "🧾", label: "Admin & facturation", match: ["comptable", "invoice-chase", "docx", "make-pdf", "xlsx", "fiscaliste", "month-heads-up"] },
  { id: "outillage", emoji: "🧠", label: "Maintenance outillage IA", match: ["repo-radar", "find-skills", "skill-creator", "write-a-skill", "graphify", "update-config", "skillify"] },
  { id: "biographie", emoji: "📖", label: "Film/site de biographie", match: ["final-cut-pro", "speech-to-text", "video-transcript", "docx", "photographe-famille", "frontend-design", "make-pdf", "music"] },
];

async function ensureDefaultBaskets() {
  const existing = await loadJson(BASKETS_F, null);
  if (existing) return existing;
  await saveJson(BASKETS_F, { baskets: DEFAULT_BASKETS });
  return { baskets: DEFAULT_BASKETS };
}

export async function readLibrary({ refresh = false } = {}) {
  let lib = refresh ? null : await loadJson(LIBRARY_F, null);
  if (!lib) lib = await libraryScan();
  const baskets = (await ensureDefaultBaskets()).baskets;
  // résolution des paniers → entrées (match par inclusion de nom, insensible casse)
  const resolved = baskets.map((b) => {
    const ids = new Set();
    const items = [];
    for (const q of b.match) {
      for (const e of lib.entries) {
        if (e.name.toLowerCase().includes(q.toLowerCase()) && !ids.has(e.id)) {
          ids.add(e.id);
          items.push(e.id);
        }
      }
    }
    return { ...b, items };
  });
  return { ...lib, baskets: resolved };
}

export function basketBrief(lib, basket) {
  const byId = Object.fromEntries(lib.entries.map((e) => [e.id, e]));
  const L = [`# 🧺 Brief d'outillage — ${basket.label}`, "",
    "Pour cette mission, pense à utiliser ces outils installés :", ""];
  for (const id of basket.items) {
    const e = byId[id];
    if (!e) continue;
    L.push(`- **${e.name}** (\`${e.invocation}\`, ${e.surface}) — ${e.when || e.description}`);
  }
  L.push("", "_Généré par Claude UpToDate._");
  return L.join("\n");
}
