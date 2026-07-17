// claude-uptodate — moteur (port Node du radar.py d'origine, zéro dépendance)
// Suit les repos GitHub clonés, les skills (git / skills-CLI / mappés) et les
// marketplaces de plugins Claude Code. Données 100% compatibles avec l'ancien
// radar.py : ~/.claude/repo-radar/ (config, manifest, state, mapping, history.jsonl).
import { spawn } from "node:child_process";
import { promises as fs, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const DATA = path.resolve(
  (process.env.REPO_RADAR_DATA || path.join(os.homedir(), ".claude", "repo-radar")).replace(
    /^~(?=$|\/)/,
    os.homedir()
  )
);
const F = {
  config: path.join(DATA, "config.json"),
  manifest: path.join(DATA, "manifest.json"),
  state: path.join(DATA, "state.json"),
  mapping: path.join(DATA, "mapping.json"),
  history: path.join(DATA, "history.jsonl"),
  reports: path.join(DATA, "reports"),
  latest: path.join(DATA, "latest.md"),
};

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
  "août", "septembre", "octobre", "novembre", "décembre"];

// ------------------------------------------------------------------ helpers

function expand(p) {
  return p.replace(/^~(?=$|\/)/, os.homedir());
}

// Sous-processus sans shell (shell:false) — arguments passés en liste, aucune
// interpolation possible → pas d'injection de commande.
export function sh(cmd, args, { cwd, timeout = 45000 } = {}) {
  return new Promise((resolve) => {
    let out = "";
    let err = "";
    let settled = false;
    const done = (code) => {
      if (settled) return;
      settled = true;
      resolve({ code, out: out.trim(), err: err.trim() });
    };
    let child;
    try {
      child = spawn(cmd, args, {
        cwd,
        timeout,
        shell: false,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      });
    } catch (e) {
      err = String(e);
      done(127);
      return;
    }
    child.stdout?.on("data", (d) => { if (out.length < 8_000_000) out += d; });
    child.stderr?.on("data", (d) => { if (err.length < 1_000_000) err += d; });
    child.on("error", (e) => { err = err || String(e); done(127); });
    child.on("close", (code) => done(code ?? 1));
  });
}

async function ghApi(apiPath, timeout = 30000) {
  // 1) gh CLI (authentifié, 5000 req/h) — 2) repli fetch anonyme (60 req/h)
  const r = await sh("gh", ["api", apiPath], { timeout });
  if (r.code === 0 && r.out) {
    try { return JSON.parse(r.out); } catch { /* ignore */ }
  }
  try {
    const res = await fetch(`https://api.github.com/${apiPath}`, {
      headers: { "User-Agent": "claude-uptodate", Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function loadJson(file, dflt) {
  try { return JSON.parse(await fs.readFile(file, "utf-8")); } catch { return dflt; }
}
async function saveJson(file, obj) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(obj, null, 2) + "\n", "utf-8");
}
const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");
const parseIso = (s) => { const d = s ? new Date(s) : null; return d && !isNaN(d) ? d : null; };

export function ago(iso) {
  const d = parseIso(iso);
  if (!d) return "?";
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 31) return `il y a ${days} j`;
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`;
  const n = Math.floor(days / 365);
  return `il y a ${n} an${n > 1 ? "s" : ""}`;
}

export function frDate(d = new Date()) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${JOURS[(d.getDay() + 6) % 7]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

export function githubSlug(url) {
  const m = /github\.com[:/]+([^/]+)\/([^/\s]+?)(?:\.git)?\/?$/.exec(url || "");
  return m ? `${m[1]}/${m[2]}` : null;
}

async function appendHistory(event) {
  await fs.mkdir(DATA, { recursive: true });
  await fs.appendFile(F.history, JSON.stringify(event) + "\n", "utf-8");
}

// ------------------------------------------------------------------- config

async function defaultConfig() {
  let login = "";
  const u = await ghApi("user");
  if (u && typeof u === "object") login = u.login || "";
  return {
    github_login: login,
    scan_roots: [{ path: "~/Downloads/VibeCoding", maxdepth: 3 }],
    skills_dirs: ["~/.claude/skills", "~/.agents/skills"],
    skill_lock: "~/.agents/.skill-lock.json",
    marketplaces_dir: "~/.claude/plugins/marketplaces",
    track_own_repos: false,
    prune: ["node_modules", ".next", "dist", "build", ".venv", "venv",
      "__pycache__", ".turbo", ".cache"],
  };
}

export async function getConfig() {
  let cfg = await loadJson(F.config, null);
  if (!cfg) {
    cfg = await defaultConfig();
    await saveJson(F.config, cfg);
  }
  return cfg;
}

// --------------------------------------------------------------------- scan

async function findGitRepos(root, maxdepth, prune) {
  root = path.resolve(expand(root));
  const repos = [];
  if (!existsSync(root)) return repos;
  async function walk(dir, depth) {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    const names = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    if (names.includes(".git")) {
      try {
        const st = await fs.stat(path.join(dir, ".git"));
        if (st.isDirectory()) { repos.push(dir); return; } // ne pas descendre dans un repo
      } catch { /* ignore */ }
    }
    if (depth >= maxdepth) return;
    for (const n of names) {
      if (prune.has(n) || n.startsWith(".")) continue;
      await walk(path.join(dir, n), depth + 1);
    }
  }
  await walk(root, 0);
  return repos;
}

export async function scan() {
  const cfg = await getConfig();
  const mapping = await loadJson(F.mapping, {});
  const login = (cfg.github_login || "").toLowerCase();
  const items = [];
  const ownRepos = [];
  const seenKeys = new Set();

  const add = (item) => {
    const base = item.key;
    let n = 2;
    while (seenKeys.has(item.key)) item.key = `${base}#${n++}`;
    seenKeys.add(item.key);
    items.push(item);
  };

  // 1) repos git dans les racines de scan
  for (const rootspec of cfg.scan_roots) {
    const repos = await findGitRepos(rootspec.path, rootspec.maxdepth ?? 3, new Set(cfg.prune));
    for (const p of repos) {
      const { out: url } = await sh("git", ["-C", p, "remote", "get-url", "origin"], { timeout: 10000 });
      const slug = githubSlug(url);
      const own = !!(login && slug && slug.toLowerCase().startsWith(login + "/"));
      if (own && !cfg.track_own_repos) { ownRepos.push(p); continue; }
      if (!url) { ownRepos.push(p + "  (sans remote)"); continue; }
      add({ key: `repo:${path.basename(p).toLowerCase()}`, type: "repo", name: path.basename(p), path: p, slug, url });
    }
  }

  // 2) skills : clones git vs orphelins (dédupliqués par realpath)
  const lock = (await loadJson(expand(cfg.skill_lock), {})).skills || {};
  const orphans = [];
  const seenReal = new Set();
  for (const sd of cfg.skills_dirs) {
    const dir = expand(sd);
    if (!existsSync(dir)) continue;
    let children;
    try { children = (await fs.readdir(dir, { withFileTypes: true })).filter((e) => !e.name.startsWith(".")); } catch { continue; }
    for (const c of children.sort((a, b) => a.name.localeCompare(b.name))) {
      const child = path.join(dir, c.name);
      let stat;
      try { stat = await fs.stat(child); } catch { continue; }
      if (!stat.isDirectory()) continue;
      let real;
      try { real = await fs.realpath(child); } catch { real = child; }
      if (seenReal.has(real)) continue;
      seenReal.add(real);
      if (existsSync(path.join(child, ".git"))) {
        const { out: url } = await sh("git", ["-C", child, "remote", "get-url", "origin"], { timeout: 10000 });
        add({ key: `skill-git:${c.name.toLowerCase()}`, type: "skill-git", name: c.name, path: child, slug: githubSlug(url), url });
      } else if (lock[c.name] || mapping[c.name] || c.name === "repo-radar") {
        // géré par le lock CLI, le mapping, ou l'ancien outil
      } else {
        orphans.push(c.name);
      }
    }
  }

  // 3) skills gérés par le skills CLI (npx skills) via .skill-lock.json
  for (const [name, e] of Object.entries(lock)) {
    add({
      key: `skill-cli:${name.toLowerCase()}`, type: "skill-cli", name,
      slug: e.source || githubSlug(e.sourceUrl || ""),
      path_filter: path.posix.dirname(e.skillPath || "") === "." ? "" : path.posix.dirname(e.skillPath || ""),
      installed_at: e.updatedAt || e.installedAt,
    });
  }

  // 4) skills orphelins mappés manuellement vers leur source
  for (const [name, m] of Object.entries(mapping)) {
    add({
      key: `skill-mapped:${name.toLowerCase()}`, type: "skill-mapped", name,
      slug: m.slug, path_filter: m.path || "",
      baseline_date: m.baseline_date, baseline_sha: m.baseline_sha,
    });
  }

  // 5) marketplaces de plugins Claude Code
  const mp = expand(cfg.marketplaces_dir);
  if (existsSync(mp)) {
    const children = (await fs.readdir(mp, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const c of children) {
      const child = path.join(mp, c.name);
      if (!existsSync(path.join(child, ".git"))) continue;
      const { out: url } = await sh("git", ["-C", child, "remote", "get-url", "origin"], { timeout: 10000 });
      add({ key: `marketplace:${c.name.toLowerCase()}`, type: "marketplace", name: c.name, path: child, slug: githubSlug(url), url });
    }
  }

  const manifest = {
    generated_at: nowIso(),
    items,
    orphans: orphans.sort((a, b) => a.localeCompare(b)),
    own_repos_skipped: ownRepos,
  };
  await saveJson(F.manifest, manifest);
  return manifest;
}

// -------------------------------------------------------------------- check

async function checkGitItem(it, doFetch = true) {
  const p = it.path;
  const rec = { kind: "git" };
  if (doFetch) {
    const r = await sh("git", ["-C", p, "fetch", "--quiet", "--prune"], { timeout: 60000 });
    if (r.code !== 0) rec.fetch_error = (r.err || "échec fetch").slice(0, 200);
  }
  const { out: branch } = await sh("git", ["-C", p, "rev-parse", "--abbrev-ref", "HEAD"], { timeout: 10000 });
  let up = null;
  let r = await sh("git", ["-C", p, "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], { timeout: 10000 });
  if (r.code === 0 && r.out) up = r.out;
  else {
    r = await sh("git", ["-C", p, "symbolic-ref", "refs/remotes/origin/HEAD"], { timeout: 10000 });
    if (r.code === 0 && r.out.startsWith("refs/remotes/")) up = r.out.slice("refs/remotes/".length);
    else if (branch) {
      r = await sh("git", ["-C", p, "rev-parse", "--verify", `origin/${branch}`], { timeout: 10000 });
      if (r.code === 0) up = `origin/${branch}`;
    }
  }
  if (!up) { rec.status = "error"; rec.error = "branche upstream introuvable"; return rec; }
  const behind = (await sh("git", ["-C", p, "rev-list", "--count", `HEAD..${up}`], { timeout: 15000 })).out;
  const ahead = (await sh("git", ["-C", p, "rev-list", "--count", `${up}..HEAD`], { timeout: 15000 })).out;
  rec.branch = branch;
  rec.upstream = up;
  rec.behind = parseInt(behind || "0", 10) || 0;
  rec.ahead = parseInt(ahead || "0", 10) || 0;
  rec.remote_sha = (await sh("git", ["-C", p, "rev-parse", up], { timeout: 10000 })).out;
  rec.remote_date = (await sh("git", ["-C", p, "log", "-1", "--format=%cI", up], { timeout: 10000 })).out;
  rec.local_date = (await sh("git", ["-C", p, "log", "-1", "--format=%cI", "HEAD"], { timeout: 10000 })).out;
  rec.dirty = !!(await sh("git", ["-C", p, "status", "--porcelain"], { timeout: 15000 })).out;
  if (rec.behind > 0) {
    const { out: log } = await sh(
      "git", ["-C", p, "log", "--format=%h%x09%cs%x09%s", `HEAD..${up}`, "-n", "15"], { timeout: 15000 });
    rec.new_commits = log.split("\n").filter(Boolean).map((l) => {
      const [sha, date, subject] = l.split("\t");
      return { sha, date, subject: subject || "" };
    });
  }
  rec.status = rec.behind > 0 ? "behind" : "ok";
  return rec;
}

async function checkApiItem(it) {
  const rec = { kind: "api" };
  const slug = it.slug;
  if (!slug) { rec.status = "error"; rec.error = "source inconnue"; return rec; }
  let q = `repos/${slug}/commits?per_page=1`;
  if (it.path_filter) q += "&path=" + encodeURIComponent(it.path_filter);
  const commits = await ghApi(q);
  if (!Array.isArray(commits) || !commits.length) {
    rec.status = "error";
    rec.error = `API GitHub muette pour ${slug}`;
    return rec;
  }
  const c = commits[0];
  rec.remote_sha = (c.sha || "").slice(0, 12);
  rec.remote_date = c.commit?.committer?.date || null;
  rec.last_subject = (c.commit?.message || "").split("\n")[0].slice(0, 120);
  const baseline = it.installed_at || it.baseline_date || null;
  const bd = parseIso(baseline);
  const rd = parseIso(rec.remote_date);
  if (baseline == null) rec.status = "baseline";
  else if (bd && rd && rd > bd) { rec.status = "update_available"; rec.baseline_date = baseline; }
  else rec.status = "ok";
  return rec;
}

async function collectBrewOutdated() {
  // paquets Homebrew en retard (apps/CLI installées hors git — ex. OpenHuman, gh, ffmpeg)
  const r = await sh("brew", ["outdated", "--json=v2"], { timeout: 90000 });
  if (r.code !== 0 || !r.out) return [];
  try {
    const j = JSON.parse(r.out);
    const out = [];
    for (const f of j.formulae || []) {
      out.push({ name: f.name, installed: (f.installed_versions || [])[0] || "", latest: f.current_version || "", cask: false });
    }
    for (const c of j.casks || []) {
      out.push({ name: c.name, installed: String(c.installed_versions || ""), latest: c.current_version || "", cask: true });
    }
    return out;
  } catch { return []; }
}

async function checkRelease(slug) {
  const rel = await ghApi(`repos/${slug}/releases/latest`);
  if (rel && typeof rel === "object" && rel.tag_name) {
    return { tag: rel.tag_name, name: rel.name || "", date: rel.published_at };
  }
  return null;
}

async function pool(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    for (;;) {
      const idx = i++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) || 1 }, worker));
  return results;
}

export async function check({ fetch: doFetch = true, rescan = false, onProgress } = {}) {
  const cfg = await getConfig();
  const manifest = rescan ? await scan() : (await loadJson(F.manifest, null)) || (await scan());
  const mapping = await loadJson(F.mapping, {});
  const state = await loadJson(F.state, { items: {} });
  const prevItems = state.items || {};
  const ts = nowIso();
  const results = {};
  let done = 0;

  const recs = await pool(manifest.items, 4, async (it) => {
    let rec;
    if (["repo", "skill-git", "marketplace"].includes(it.type)) {
      rec = await checkGitItem(it, doFetch);
      if (it.slug && ["repo", "skill-git"].includes(it.type)) rec.release = await checkRelease(it.slug);
    } else {
      rec = await checkApiItem(it);
      if (rec.status === "baseline" && it.type === "skill-mapped") {
        const m = mapping[it.name] || {};
        m.baseline_date = rec.remote_date;
        m.baseline_sha = rec.remote_sha;
        mapping[it.name] = m;
      }
    }
    done += 1;
    onProgress?.(done, manifest.items.length, it.name);
    return rec;
  });

  for (let idx = 0; idx < manifest.items.length; idx++) {
    const it = manifest.items[idx];
    const rec = recs[idx];
    const prev = prevItems[it.key] || {};
    rec.new_since_last = !!(prev.remote_sha && rec.remote_sha && prev.remote_sha !== rec.remote_sha);
    rec.checked_at = ts;
    results[it.key] = rec;

    const prevRel = prev.release?.tag;
    const newRel = rec.release?.tag;
    const firstSeenAlert = ["behind", "update_available"].includes(rec.status) && !Object.keys(prev).length;
    if (rec.new_since_last || (newRel && newRel !== prevRel) || firstSeenAlert) {
      await appendHistory({
        ts, key: it.key, name: it.name, type: it.type, event: "upstream_change",
        status: rec.status, behind: rec.behind, remote_sha: rec.remote_sha,
        remote_date: rec.remote_date, release: newRel ?? null,
        new_commits: (rec.new_commits || []).slice(0, 8),
        subject: rec.last_subject,
      });
    }
  }

  await saveJson(F.mapping, mapping);
  const brew = await collectBrewOutdated();
  await saveJson(F.state, { checked_at: ts, items: results, brew });
  const report = renderReport(cfg, manifest, results, brew);
  await fs.mkdir(F.reports, { recursive: true });
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}_${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
  await fs.writeFile(path.join(F.reports, `${stamp}.md`), report, "utf-8");
  await fs.writeFile(F.latest, report, "utf-8");
  return { manifest, state: { checked_at: ts, items: results, brew }, report };
}

// ------------------------------------------------------------------- report

export function renderReport(cfg, manifest, results, brew = []) {
  const counts = {};
  for (const it of manifest.items) counts[it.type] = (counts[it.type] || 0) + 1;
  const byKey = Object.fromEntries(manifest.items.map((i) => [i.key, i]));
  const L = [`# 📡 Claude UpToDate — ${frDate()}`, ""];
  L.push(`_Suivi : ${counts.repo || 0} repos tiers · ${counts["skill-git"] || 0} skills git · ` +
    `${counts["skill-cli"] || 0} skills CLI · ${counts["skill-mapped"] || 0} skills mappés · ` +
    `${counts.marketplace || 0} marketplaces plugins · ${(manifest.orphans || []).length} skills sans source_`, "");

  const keys = Object.keys(results);
  const news = keys.filter((k) => results[k].new_since_last);
  if (news.length) {
    L.push(`## 🆕 Du nouveau depuis le dernier check (${news.length})`);
    for (const k of news) L.push(`- **${byKey[k]?.name}** — upstream avancé (${ago(results[k].remote_date)})`);
    L.push("");
  }

  const behind = keys.filter((k) => results[k].status === "behind")
    .sort((a, b) => (results[b].behind || 0) - (results[a].behind || 0));
  if (behind.length) {
    L.push(`## 🔴 En retard (${behind.length})`);
    for (const k of behind) {
      const it = byKey[k]; const r = results[k];
      if (!it) continue;
      const slug = it.slug ? ` · [${it.slug}](https://github.com/${it.slug})` : "";
      L.push(`### ${it.name} — ${r.behind} commit(s) de retard · dernier upstream ${ago(r.remote_date)}${slug}`);
      if (it.path) L.push(`\`${it.path}\``);
      for (const c of (r.new_commits || []).slice(0, 8)) L.push(`- \`${c.sha}\` ${c.date} — ${c.subject}`);
      if ((r.behind || 0) > 8) L.push(`- … et ${r.behind - 8} autre(s)`);
      const flags = [];
      if (r.dirty) flags.push("modifs locales non commitées");
      if (r.ahead) flags.push(`${r.ahead} commit(s) locaux non poussés`);
      L.push(flags.length
        ? `⚠️ ${flags.join(", ")} — mise à jour auto refusée, à traiter à la main`
        : `→ \`uptodate update ${it.name}\``);
      L.push("");
    }
  }

  const upd = keys.filter((k) => results[k].status === "update_available");
  if (upd.length) {
    L.push(`## 📦 Skills avec mise à jour probable (${upd.length})`);
    for (const k of upd) {
      const it = byKey[k]; const r = results[k];
      if (!it) continue;
      const via = it.type === "skill-cli" ? "npx skills update" : "réinstaller depuis la source";
      L.push(`- **${it.name}** (${it.slug}) — dernier commit upstream ${ago(r.remote_date)} : “${r.last_subject || ""}”  → \`${via}\``);
    }
    L.push("");
  }

  const rels = keys.filter((k) => results[k].release);
  if (rels.length) {
    L.push("## 🎁 Dernières releases");
    for (const k of rels) {
      const rel = results[k].release;
      const name = (rel.name || "").trim();
      const label = name.toLowerCase().startsWith(rel.tag.toLowerCase()) ? name : name ? `${rel.tag} — ${name}` : rel.tag;
      L.push(`- **${byKey[k]?.name}** : ${label} (${ago(rel.date)})`);
    }
    L.push("");
  }

  const local = keys.filter((k) => results[k].status === "ok" && (results[k].dirty || results[k].ahead));
  if (local.length) {
    L.push(`## ✏️ À jour mais modifiés localement (${local.length})`);
    for (const k of local) {
      const r = results[k]; const what = [];
      if (r.ahead) what.push(`${r.ahead} commit(s) locaux`);
      if (r.dirty) what.push("modifs non commitées");
      L.push(`- **${byKey[k]?.name}** — ${what.join(", ")}`);
    }
    L.push("");
  }

  const ok = keys.filter((k) => results[k].status === "ok" && !results[k].dirty && !results[k].ahead);
  if (ok.length) {
    L.push(`## ✅ À jour (${ok.length})`);
    for (const k of ok) L.push(`- **${byKey[k]?.name}** — dernier upstream ${ago(results[k].remote_date)}`);
    L.push("");
  }

  const base = keys.filter((k) => results[k].status === "baseline");
  if (base.length) {
    L.push(`## 📍 Baseline établie (${base.length}) — comparaison possible dès le prochain check`);
    for (const k of base) L.push(`- ${byKey[k]?.name} (${byKey[k]?.slug})`);
    L.push("");
  }

  const errs = keys.filter((k) => results[k].status === "error" || results[k].fetch_error);
  if (errs.length) {
    L.push(`## ⚠️ Vérification impossible (${errs.length})`);
    for (const k of errs) L.push(`- **${byKey[k]?.name}** — ${results[k].error || results[k].fetch_error}`);
    L.push("");
  }

  if (brew.length) {
    L.push(`## 🍺 Homebrew en retard (${brew.length})`);
    for (const b of brew.slice(0, 25)) {
      L.push(`- **${b.name}**${b.cask ? " (app)" : ""} : ${b.installed} → ${b.latest}  · \`brew upgrade ${b.cask ? "--cask " : ""}${b.name}\``);
    }
    if (brew.length > 25) L.push(`- … et ${brew.length - 25} autre(s)`);
    L.push("");
  }

  const orphans = manifest.orphans || [];
  if (orphans.length) {
    L.push(`## ❓ Skills sans source connue (${orphans.length})`);
    L.push("Impossible de savoir s'ils sont à jour. Mappe-les un par un (commande `map`).", "");
    L.push("<details><summary>Voir la liste</summary>", "");
    L.push(orphans.map((o) => `\`${o}\``).join(", "), "", "</details>", "");
  }
  return L.join("\n");
}

// ------------------------------------------------------------------- update

export async function update({ name = "", all = false } = {}) {
  const manifest = await loadJson(F.manifest, null);
  const state = await loadJson(F.state, { items: {} });
  const log = [];
  if (!manifest) return { ok: false, log: ["Lance d'abord un scan + check."] };

  let targets;
  if (all) {
    targets = manifest.items.filter((it) =>
      ["behind", "update_available"].includes(state.items?.[it.key]?.status));
  } else {
    const q = name.toLowerCase();
    targets = manifest.items.filter((it) => it.name.toLowerCase().includes(q));
    if (!targets.length) {
      // repli : paquet Homebrew signalé en retard au dernier check
      const b = (state.brew || []).find((x) => x.name.toLowerCase() === q) ||
        (state.brew || []).find((x) => x.name.toLowerCase().includes(q));
      if (b) {
        log.push(`→ brew upgrade ${b.cask ? "--cask " : ""}${b.name} (${b.installed} → ${b.latest})…`);
        const r = await sh("brew", ["upgrade", ...(b.cask ? ["--cask"] : []), b.name], { timeout: 900000 });
        log.push((r.out || r.err).split("\n").slice(-6).join("\n").slice(0, 600));
        if (r.code === 0) {
          await appendHistory({ ts: nowIso(), key: `brew:${b.name}`, name: b.name, type: "brew", event: "updated", from: b.installed, to: b.latest });
          log.push(`✓ ${b.name} : mis à jour via Homebrew.`);
          state.brew = (state.brew || []).filter((x) => x.name !== b.name);
          await saveJson(F.state, state);
          return { ok: true, log, updated: [b.name] };
        }
        return { ok: false, log };
      }
      return { ok: false, log: [`Aucun élément ne correspond à « ${name} ».`] };
    }
    if (targets.length > 1) {
      const exact = targets.filter((t) => t.name.toLowerCase() === q);
      if (exact.length === 1) targets = exact;
      else return { ok: false, log: ["Plusieurs correspondances : " + targets.map((t) => t.name).join(", ")] };
    }
  }

  let cliDone = false;
  const updated = [];
  for (const it of targets) {
    const rec = state.items?.[it.key] || {};
    if (["repo", "skill-git", "marketplace"].includes(it.type)) {
      if (rec.dirty || rec.ahead) {
        log.push(`⏭ ${it.name} : modifs locales — je ne touche pas (stash/commit puis pull).`);
        continue;
      }
      const p = it.path;
      const pre = (await sh("git", ["-C", p, "rev-parse", "HEAD"], { timeout: 10000 })).out;
      const r = await sh("git", ["-C", p, "pull", "--ff-only"], { timeout: 180000 });
      if (r.code !== 0) { log.push(`✗ ${it.name} : pull refusé — ${r.err.slice(0, 200)}`); continue; }
      const post = (await sh("git", ["-C", p, "rev-parse", "HEAD"], { timeout: 10000 })).out;
      if (pre === post) { log.push(`= ${it.name} : déjà à jour.`); continue; }
      const { out: gl } = await sh("git", ["-C", p, "log", "--format=%h%x09%cs%x09%s", `${pre}..${post}`, "-n", "20"], { timeout: 15000 });
      const commits = gl.split("\n").filter(Boolean).map((l) => {
        const [sha, date, subject] = l.split("\t");
        return { sha, date, subject: subject || "" };
      });
      await appendHistory({
        ts: nowIso(), key: it.key, name: it.name, type: it.type, event: "updated",
        from: pre.slice(0, 12), to: post.slice(0, 12), new_commits: commits.slice(0, 12),
      });
      log.push(`✓ ${it.name} : mis à jour (${commits.length} commit(s)).`);
      updated.push(it.name);
    } else if (it.type === "skill-cli" && !cliDone) {
      log.push("→ npx skills update (tous les skills gérés par le CLI)…");
      const r = await sh("npx", ["-y", "skills", "update"], { timeout: 420000 });
      log.push((r.out || r.err).slice(0, 800));
      await appendHistory({
        ts: nowIso(), key: "skills-cli", name: "skills CLI", type: "skill-cli",
        event: "updated", detail: (r.out || r.err).slice(0, 500),
      });
      cliDone = true;
      updated.push("skills CLI");
    } else if (it.type === "skill-mapped") {
      log.push(`ℹ️ ${it.name} : copié sans git — pas de MAJ auto. Source : https://github.com/${it.slug}`);
    }
  }
  return { ok: true, log, updated };
}

// ---------------------------------------------------------------------- map

export async function mapSkill({ skill, slug, path: sub = "" }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(slug)) return { ok: false, log: ["Format attendu : owner/repo"] };
  const cfg = await getConfig();
  const exists = cfg.skills_dirs.some((sd) => existsSync(path.join(expand(sd), skill)));
  const mapping = await loadJson(F.mapping, {});
  const entry = { slug, path: sub || "", mapped_at: nowIso() };
  let q = `repos/${slug}/commits?per_page=1`;
  if (sub) q += "&path=" + encodeURIComponent(sub);
  const commits = await ghApi(q);
  if (Array.isArray(commits) && commits.length) {
    entry.baseline_sha = (commits[0].sha || "").slice(0, 12);
    entry.baseline_date = commits[0].commit?.committer?.date || null;
  }
  mapping[skill] = entry;
  await saveJson(F.mapping, mapping);
  await scan();
  return {
    ok: true,
    log: [
      (exists ? "" : `⚠️ dossier « ${skill} » introuvable dans les skills_dirs — mappé quand même. `) +
      `✓ ${skill} → ${slug}${sub ? ` (path: ${sub})` : ""} — baseline ${entry.baseline_date || "au prochain check"}`,
    ],
  };
}

// ------------------------------------------------------------------ lecture

export async function snapshot() {
  return {
    data_dir: DATA,
    config: await getConfig(),
    manifest: await loadJson(F.manifest, null),
    state: await loadJson(F.state, null),
  };
}

export async function readHistory({ name = "", limit = 200 } = {}) {
  let lines;
  try { lines = (await fs.readFile(F.history, "utf-8")).split("\n").filter(Boolean); } catch { return []; }
  let events = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  if (name) {
    const q = name.toLowerCase();
    events = events.filter((e) => (e.name || "").toLowerCase().includes(q));
  }
  return events.slice(-limit);
}

export async function readLatestReport() {
  try { return await fs.readFile(F.latest, "utf-8"); } catch { return null; }
}
