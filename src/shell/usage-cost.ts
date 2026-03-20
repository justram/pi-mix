import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";

export type UsageCostTotals = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
};

type CachedUsageCostTotals = {
  totals: UsageCostTotals;
};

let usageCostCache = new Map<string, CachedUsageCostTotals>();

function createEmptyUsageCostTotals(): UsageCostTotals {
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    cost: 0,
  };
}

function cloneUsageCostTotals(totals: UsageCostTotals): UsageCostTotals {
  return {
    input: totals.input,
    output: totals.output,
    cacheRead: totals.cacheRead,
    cacheWrite: totals.cacheWrite,
    cost: totals.cost,
  };
}

function toFiniteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getUsageCostCacheKey(ctx: ExtensionContext): string {
  const sessionFile =
    typeof ctx.sessionManager.getSessionFile === "function"
      ? ctx.sessionManager.getSessionFile()
      : undefined;
  if (typeof sessionFile === "string" && sessionFile.length > 0) {
    return `session:${sessionFile}`;
  }

  const sessionId =
    typeof ctx.sessionManager.getSessionId === "function"
      ? ctx.sessionManager.getSessionId()
      : undefined;
  if (typeof sessionId === "string" && sessionId.length > 0) {
    return `session-id:${sessionId}`;
  }

  return `cwd:${ctx.cwd}`;
}

function addAssistantUsageToTotals(totals: UsageCostTotals, message: AgentMessage): void {
  if (message.role !== "assistant") return;

  const usage = (message as unknown as { usage?: Record<string, unknown> }).usage;
  if (!usage || typeof usage !== "object") return;

  totals.input += toFiniteNumber(usage.input);
  totals.output += toFiniteNumber(usage.output);
  totals.cacheRead += toFiniteNumber(usage.cacheRead);
  totals.cacheWrite += toFiniteNumber(usage.cacheWrite);

  const cost = usage.cost;
  if (cost && typeof cost === "object") {
    totals.cost += toFiniteNumber((cost as { total?: unknown }).total);
  }
}

function computeUsageCostTotals(ctx: ExtensionContext): UsageCostTotals {
  const totals = createEmptyUsageCostTotals();

  for (const entry of ctx.sessionManager.getEntries()) {
    if (entry.type !== "message") continue;
    addAssistantUsageToTotals(totals, entry.message);
  }

  return totals;
}

export function getUsageCostTotals(ctx: ExtensionContext): UsageCostTotals {
  const cacheKey = getUsageCostCacheKey(ctx);
  const cached = usageCostCache.get(cacheKey);
  if (cached) {
    return cached.totals;
  }

  const totals = computeUsageCostTotals(ctx);
  usageCostCache.set(cacheKey, { totals });
  return totals;
}

export function recomputeUsageCostTotals(ctx: ExtensionContext): UsageCostTotals {
  const totals = computeUsageCostTotals(ctx);
  usageCostCache.set(getUsageCostCacheKey(ctx), { totals });
  return totals;
}

export function recordUsageCostFromMessageEnd(
  ctx: ExtensionContext,
  message: AgentMessage,
): UsageCostTotals {
  const cacheKey = getUsageCostCacheKey(ctx);
  const cached = usageCostCache.get(cacheKey);
  const totals = cloneUsageCostTotals(cached?.totals ?? computeUsageCostTotals(ctx));
  addAssistantUsageToTotals(totals, message);
  usageCostCache.set(cacheKey, { totals });
  return totals;
}

export function invalidateUsageCostTotals(ctx: ExtensionContext): void {
  usageCostCache.delete(getUsageCostCacheKey(ctx));
}

export function resetUsageCostTotalsForTests(): void {
  usageCostCache = new Map<string, CachedUsageCostTotals>();
}
