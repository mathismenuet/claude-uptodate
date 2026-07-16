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

export interface State {
  checked_at: string;
  items: Record<string, ItemState>;
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
