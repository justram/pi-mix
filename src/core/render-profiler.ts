type RenderProfileStat = {
  calls: number;
  totalNs: bigint;
  maxNs: bigint;
};

let enabledOverride: boolean | undefined;
let exitHookInstalled = false;
let stats = new Map<string, RenderProfileStat>();

function isEnabled(): boolean {
  return enabledOverride ?? process.env.PI_MIX_PROFILE_RENDER === "1";
}

function getDurationMs(durationNs: bigint): number {
  return Number(durationNs) / 1_000_000;
}

function ensureExitHook(): void {
  if (exitHookInstalled || !isEnabled()) return;

  process.once("exit", () => {
    const report = formatRenderProfileReport();
    if (report.length > 0) {
      process.stderr.write(`${report}\n`);
    }
  });
  exitHookInstalled = true;
}

function recordRenderDuration(name: string, durationNs: bigint): void {
  const previous = stats.get(name);
  if (!previous) {
    stats.set(name, {
      calls: 1,
      totalNs: durationNs,
      maxNs: durationNs,
    });
    return;
  }

  previous.calls += 1;
  previous.totalNs += durationNs;
  if (durationNs > previous.maxNs) {
    previous.maxNs = durationNs;
  }
}

export function profileRender<T>(name: string, fn: () => T): T {
  if (!isEnabled()) {
    return fn();
  }

  ensureExitHook();
  const startedAt = process.hrtime.bigint();
  try {
    return fn();
  } finally {
    recordRenderDuration(name, process.hrtime.bigint() - startedAt);
  }
}

export function getRenderProfileSnapshot(): Array<{
  name: string;
  calls: number;
  totalMs: number;
  avgMs: number;
  maxMs: number;
}> {
  return Array.from(stats.entries())
    .map(([name, stat]) => ({
      name,
      calls: stat.calls,
      totalMs: getDurationMs(stat.totalNs),
      avgMs: getDurationMs(stat.totalNs) / stat.calls,
      maxMs: getDurationMs(stat.maxNs),
    }))
    .sort((left, right) => right.totalMs - left.totalMs || right.calls - left.calls);
}

export function formatRenderProfileReport(): string {
  const snapshot = getRenderProfileSnapshot();
  if (snapshot.length === 0) return "";

  const lines = ["[pi-mix render profile]"];
  for (const stat of snapshot) {
    lines.push(
      `${stat.name} calls=${stat.calls} total=${stat.totalMs.toFixed(3)}ms avg=${stat.avgMs.toFixed(3)}ms max=${stat.maxMs.toFixed(3)}ms`,
    );
  }
  return lines.join("\n");
}

export function resetRenderProfilerForTests(): void {
  stats = new Map<string, RenderProfileStat>();
  enabledOverride = undefined;
}

export function setRenderProfilerEnabledForTests(enabled: boolean): void {
  enabledOverride = enabled;
}
