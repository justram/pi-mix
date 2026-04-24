import type { ExtensionContext, ThemeColor } from "@mariozechner/pi-coding-agent";

export type ContextStatus = "success" | "warning" | "error";

export type ContextUsage = ReturnType<ExtensionContext["getContextUsage"]>;
type CachedUsage = {
  usage: ContextUsage;
};

type RefreshContextUsageOptions = {
  force?: boolean;
};

let usageCache = new Map<string, CachedUsage>();

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getUsedContextRatio(usage: ContextUsage | undefined): number | undefined {
  if (!usage) {
    return undefined;
  }

  if (typeof usage.percent === "number") {
    return clamp(usage.percent / 100, 0, 1);
  }

  if (!usage.contextWindow || usage.contextWindow <= 0 || usage.tokens == null) {
    return undefined;
  }

  return clamp(usage.tokens / usage.contextWindow, 0, 1);
}

function getContextUsageCacheKey(ctx: ExtensionContext): string {
  const sessionFile = ctx.sessionManager.getSessionFile();
  const scope =
    typeof sessionFile === "string" && sessionFile.length > 0
      ? `session:${sessionFile}`
      : `cwd:${ctx.cwd}`;
  const provider = ctx.model?.provider ?? "no-provider";
  const modelId = ctx.model?.id ?? "no-model";
  return `${scope}|model:${provider}/${modelId}`;
}

function normalizeContextUsage(ctx: ExtensionContext, usage: ContextUsage): ContextUsage {
  const modelContextWindow = ctx.model?.contextWindow;
  if (!usage || modelContextWindow == null || modelContextWindow <= 0) {
    return usage;
  }

  if (usage.contextWindow === modelContextWindow) {
    return usage;
  }

  return {
    tokens: usage.tokens,
    contextWindow: modelContextWindow,
    percent: usage.tokens == null ? null : (usage.tokens / modelContextWindow) * 100,
  };
}

function readContextUsage(ctx: ExtensionContext): ContextUsage {
  const usage = normalizeContextUsage(ctx, ctx.getContextUsage());
  usageCache.set(getContextUsageCacheKey(ctx), { usage });
  return usage;
}

function getCachedContextUsage(
  ctx: ExtensionContext,
  options: RefreshContextUsageOptions = {},
): ContextUsage {
  const { force = false } = options;
  const cacheKey = getContextUsageCacheKey(ctx);
  const cached = usageCache.get(cacheKey);
  if (!force && cached) {
    return cached.usage;
  }
  return readContextUsage(ctx);
}

export function refreshContextUsageCache(
  ctx: ExtensionContext,
  options: RefreshContextUsageOptions = {},
): ContextUsage {
  const { force = false } = options;
  return getCachedContextUsage(ctx, { force });
}

export function getContextUsageSnapshot(ctx: ExtensionContext): ContextUsage | undefined {
  return getCachedContextUsage(ctx);
}

export function getContextRemaining(ctx: ExtensionContext): number | undefined {
  const usage = getContextUsageSnapshot(ctx);
  const used = getUsedContextRatio(usage);
  if (used == null) {
    return undefined;
  }
  return 1 - used;
}

export function getContextStatusFromRemaining(
  remaining: number | undefined,
): ContextStatus | undefined {
  if (remaining == null) return undefined;
  return remaining <= 0.15 ? "error" : remaining <= 0.5 ? "warning" : "success";
}

export function getContextStatus(ctx: ExtensionContext): ContextStatus | undefined {
  return getContextStatusFromRemaining(getContextRemaining(ctx));
}

export function getContextDisplayColorFromStatus(
  status: ContextStatus | undefined,
): ThemeColor | undefined {
  if (status == null) return undefined;
  return status === "success" ? "dim" : status;
}

export function getContextDisplayColor(ctx: ExtensionContext): ThemeColor | undefined {
  return getContextDisplayColorFromStatus(getContextStatus(ctx));
}

export function invalidateContextUsageCache(ctx: ExtensionContext): void {
  usageCache.delete(getContextUsageCacheKey(ctx));
}

export function resetContextUsageCacheForTests(): void {
  usageCache = new Map<string, CachedUsage>();
}
