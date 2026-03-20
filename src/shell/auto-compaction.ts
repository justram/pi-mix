import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type AutoCompactionMode = "auto" | "off";

type CompactionSettings = {
  enabled?: unknown;
};

type SettingsShape = {
  compaction?: CompactionSettings;
};

type CachedMode = {
  mode: AutoCompactionMode;
  readAt: number;
};

const CONFIG_DIR_NAME = ".pi";
const AUTO_COMPACTION_CACHE_TTL_MS = 250;

let modeCache = new Map<string, CachedMode>();

function getGlobalSettingsPath(): string {
  return join(homedir(), CONFIG_DIR_NAME, "agent", "settings.json");
}

function getProjectSettingsPath(cwd: string): string {
  return join(cwd, CONFIG_DIR_NAME, "settings.json");
}

function parseCompactionEnabled(content: string | undefined): boolean | undefined {
  if (!content) return undefined;

  try {
    const parsed = JSON.parse(content) as SettingsShape;
    return typeof parsed.compaction?.enabled === "boolean" ? parsed.compaction.enabled : undefined;
  } catch {
    return undefined;
  }
}

function readCompactionEnabled(path: string): boolean | undefined {
  if (!existsSync(path)) return undefined;
  return parseCompactionEnabled(readFileSync(path, "utf8"));
}

export function resolveAutoCompactionMode(
  globalEnabled: boolean | undefined,
  projectEnabled: boolean | undefined,
): AutoCompactionMode {
  const enabled = projectEnabled ?? globalEnabled ?? true;
  return enabled ? "auto" : "off";
}

export function getAutoCompactionMode(cwd: string): AutoCompactionMode {
  const cached = modeCache.get(cwd);
  const now = Date.now();
  if (cached && now - cached.readAt < AUTO_COMPACTION_CACHE_TTL_MS) {
    return cached.mode;
  }

  const mode = resolveAutoCompactionMode(
    readCompactionEnabled(getGlobalSettingsPath()),
    readCompactionEnabled(getProjectSettingsPath(cwd)),
  );
  modeCache.set(cwd, { mode, readAt: now });
  return mode;
}

export function resetAutoCompactionModeCacheForTests(): void {
  modeCache = new Map<string, CachedMode>();
}
