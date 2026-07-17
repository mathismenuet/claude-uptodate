// Types partagés client/serveur — miroir des structures JSON du moteur (engine/core.mjs)

export type ItemType = "repo" | "skill-git" | "skill-cli" | "skill-mapped" | "marketplace";

export interface ManifestItem {
  key: string;
  type: ItemType;
  name: string;
  path?: string;
  slug?: string | null;
  url?: string;
  path_filter?: string;
  installed_at?: string;
  baseline_date?: string;
  baseline_sha?: string;
}

export interface Commit {
  sha: string;
  date: string;
  subject: string;
}

export interface Release {
  tag: string;
  name: string;
  date: string | null;
}

export type ItemStatus = "ok" | "behind" | "update_available" | "baseline" | "error";

export interface ItemState {
  kind?: "git" | "api";
  status?: ItemStatus;
  behind?: number;
  ahead?: number;
  branch?: string;
  upstream?: string;
  remote_sha?: string;
  remote_date?: string | null;
  local_date?: string;
  dirty?: boolean;
  new_commits?: Commit[];
  release?: Release | null;
  fetch_error?: string;
  error?: string;
  new_since_last?: boolean;
  acked?: boolean; // « MAJ dispo » acquittée (contenu identique / retiré upstream)
  checked_at?: string;
  last_subject?: string;
  baseline_date?: string;
}

export interface Manifest {
  generated_at: string;
  items: ManifestItem[];
  orphans: string[];
  own_repos_skipped: string[];
}

export interface BrewOutdated {
  name: string;
  installed: string;
  latest: string;
  cask: boolean;
}

export interface State {
  checked_at: string;
  items: Record<string, ItemState>;
  brew?: BrewOutdated[];
}

export interface HistoryEvent {
  ts: string;
  key: string;
  name: string;
  type: string;
  event: "upstream_change" | "updated";
  status?: string;
  behind?: number;
  remote_sha?: string;
  remote_date?: string | null;
  release?: string | null;
  new_commits?: Commit[];
  subject?: string;
  from?: string;
  to?: string;
  detail?: string;
}

export interface Snapshot {
  data_dir: string;
  config: Record<string, unknown>;
  manifest: Manifest | null;
  state: State | null;
}

// ------------------------------ M2 Bibliothèque ------------------------------

export interface LibraryEntry {
  id: string;
  type: "skill";
  name: string;
  surface: "claude" | "codex" | "gemini" | string;
  container: string; // "user" | "marketplace:<nom>"
  path: string;
  installed_at?: string | null;
  description: string;
  category: string;
  when: string;
  curated: boolean;
  invocation: string;
}

export interface LibraryCategory {
  id: string;
  label: string;
  emoji: string;
  count: number;
}

export interface LibraryBasket {
  id: string;
  emoji: string;
  label: string;
  match: string[];
  items: string[]; // ids résolus
}

export interface LibraryData {
  generated_at: string;
  count: number;
  categories: LibraryCategory[];
  entries: LibraryEntry[];
  baskets: LibraryBasket[];
}

// ------------------------------ M3 Usage & Surfaces ------------------------------

export type UsageKind = "skill" | "mcp" | "command";

export interface UsageTool {
  name: string;
  kind: UsageKind;
  count: number;
  first: string;
  last: string;
  sessions: number;
}

export interface UsageWeek {
  start: string; // lundi ISO (YYYY-MM-DD)
  skills: number;
  mcp: number;
  commands: number;
}

export interface UsageData {
  generated_at: string;
  totals: {
    events: number;
    skills: number;
    mcp: number;
    commands: number;
    distinct_tools: number;
    transcripts: number;
  };
  tools: UsageTool[];
  weeks: UsageWeek[];
}

export interface UsageEvent {
  ts: string;
  kind: UsageKind;
  name: string;
  sessionId: string;
  cwd: string;
  snippet: string;
}

export interface UsageDrill {
  name: string;
  total: number;
  events: UsageEvent[];
}

export interface SurfaceInfo {
  id: string;
  label: string;
  icon: string;
  detected: boolean;
  skills: number;
  skillsDirs: string[];
  note: string;
}

export interface DuplicateCopy {
  surface: string;
  dir: string;
  hash: string;
  mtime: string | null;
}

export interface DuplicateGroup {
  name: string;
  copies: DuplicateCopy[];
  identical: boolean;
  newest: string;
  newest_surface: string;
}

export interface SurfacesReport {
  generated_at: string;
  surfaces: SurfaceInfo[];
  duplicates: DuplicateGroup[];
}

// ------------------------------ v0.4 Connexions ------------------------------

export type McpStatus = "connected" | "needs-auth" | "failed" | "installed" | "unknown";

export interface McpAction {
  kind: "command" | "link" | "info";
  label: string;
  value: string;
}

export interface McpEntry {
  name: string;
  family: "user" | "plugin" | "claude.ai" | "desktop-ext";
  scope: string;
  transport: string;
  detail: string;
  status: McpStatus;
  category: string;
  actions: McpAction[];
}

export interface ApiKeyRow {
  env: string;
  label: string;
  features: string;
  url: string;
  defined: boolean;
  where: string[];
}

export interface DockerContainer {
  name: string;
  image: string;
  status: string;
  ports: string;
}

export interface DockerProject {
  project: string;
  containers: DockerContainer[];
  update_hint: string;
}

export interface ConnectionsReport {
  generated_at: string;
  mcp: McpEntry[];
  health_error: string | null;
  apiKeys: { rows: ApiKeyRow[]; extra: string[] };
  docker: { available: boolean; error?: string; projects: DockerProject[] };
}
