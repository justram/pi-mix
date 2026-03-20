import type { ThinkingLevel } from "@mariozechner/pi-agent-core";
import {
  VERSION,
  type ExtensionContext,
  type Theme,
  type ThemeColor,
} from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

import { getAutoCompactionMode, type AutoCompactionMode } from "./auto-compaction";
import {
  getContextDisplayColorFromStatus,
  getContextStatusFromRemaining,
  getContextUsageSnapshot,
} from "./context-status";
import {
  configurePiMixEditorChrome,
  resolveEditorBorderColorFromTone,
  resolveEditorBorderTone,
} from "../editor";
import { formatModelLabel } from "./model-label";
import { getUsageCostTotals } from "./usage-cost";
import type { PiMixPrefs } from "../core/prefs";
import { profileRender } from "../core/render-profiler";

const PI_VERSION = VERSION;

function basename(path: string): string {
  const normalized = path.replace(/\/$/, "");
  const parts = normalized.split("/");
  return parts[parts.length - 1] ?? path;
}

function fitVisible(text: string, width: number): string {
  const truncated = truncateToWidth(text, width);
  return truncated + " ".repeat(Math.max(0, width - visibleWidth(truncated)));
}

function getThinkingLabel(level: ThinkingLevel): string {
  return level === "off" ? "off" : "think";
}

function getThinkingThemeColor(level: ThinkingLevel): ThemeColor {
  switch (level) {
    case "off":
      return "thinkingOff";
    case "minimal":
      return "thinkingMinimal";
    case "low":
      return "thinkingLow";
    case "medium":
      return "thinkingMedium";
    case "high":
      return "thinkingHigh";
    case "xhigh":
      return "thinkingXhigh";
  }
}

const THINKING_LEVELS = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
] as const satisfies readonly ThinkingLevel[];
const THINKING_LABEL_WIDTH = THINKING_LEVELS.reduce(
  (max, level) => Math.max(max, getThinkingLabel(level).length),
  0,
);

function getThinkingIndicator(level: ThinkingLevel): string {
  switch (level) {
    case "off":
      return "⊘";
    case "minimal":
      return "■□□□□";
    case "low":
      return "■■□□□";
    case "medium":
      return "■■■□□";
    case "high":
      return "■■■■□";
    case "xhigh":
      return "■■■■■";
  }
}

function getThinkingStatusText(level: ThinkingLevel): string {
  return `${getThinkingLabel(level).padEnd(THINKING_LABEL_WIDTH)} ${getThinkingIndicator(level)}`;
}

function renderThinkingStatus(theme: Theme, level: ThinkingLevel): string {
  return theme.fg(getThinkingThemeColor(level), getThinkingStatusText(level));
}

export function buildEditorBorderStatus(
  theme: Theme,
  modelLabel: string,
  thinkingLevel: ThinkingLevel,
  trailingStatus?: string,
): string {
  const base = `${theme.fg("dim", modelLabel)}${theme.fg("dim", " • ")}${renderThinkingStatus(theme, thinkingLevel)}`;
  if (!trailingStatus) {
    return base;
  }
  return `${base}${theme.fg("dim", " • ")}${trailingStatus}`;
}

function getAutoCompactionIcon(_mode: AutoCompactionMode): string {
  return "↧";
}

function renderAutoCompactionStatus(theme: Theme, mode: AutoCompactionMode): string {
  return `${theme.fg("borderAccent", getAutoCompactionIcon(mode))}${theme.fg("dim", ` (${mode})`)}`;
}

export function buildUsageCostIndicator(theme: Theme, ctx: ExtensionContext): string {
  return buildUsageCostIndicatorFromTotals(theme, getUsageCostTotals(ctx), {
    usingSubscription: ctx.model ? ctx.modelRegistry.isUsingOAuth(ctx.model) : false,
  });
}

export function buildUsageCostIndicatorFromTotals(
  theme: Theme,
  totals: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    cost: number;
  },
  options: {
    usingSubscription: boolean;
  },
): string {
  const statsParts: string[] = [];
  if (totals.input) statsParts.push(`↑${formatTokens(totals.input)}`);
  if (totals.output) statsParts.push(`↓${formatTokens(totals.output)}`);
  if (totals.cacheRead) statsParts.push(`R${formatTokens(totals.cacheRead)}`);
  if (totals.cacheWrite) statsParts.push(`W${formatTokens(totals.cacheWrite)}`);

  if (totals.cost || options.usingSubscription) {
    statsParts.push(`$${totals.cost.toFixed(3)}${options.usingSubscription ? " (sub)" : ""}`);
  }

  if (statsParts.length === 0) {
    return "";
  }

  return theme.fg("dim", statsParts.join(" "));
}

export function buildFooterCenterStatus(_theme: Theme, _thinkingLevel: ThinkingLevel): string {
  return "";
}

function formatTokens(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  if (count < 1000000) return `${Math.round(count / 1000)}k`;
  if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
  return `${Math.round(count / 1000000)}M`;
}

function getContextPercent(
  usage: ReturnType<ExtensionContext["getContextUsage"]>,
): number | null | undefined {
  if (!usage) {
    return undefined;
  }
  if (usage.percent === null) {
    return null;
  }
  if (typeof usage.percent === "number") {
    return usage.percent;
  }
  if (usage.tokens == null || usage.contextWindow <= 0) {
    return undefined;
  }
  return (usage.tokens / usage.contextWindow) * 100;
}

export function buildFooterRightStatus(
  theme: Theme,
  ctx: ExtensionContext,
  autoCompactionMode: AutoCompactionMode,
): string {
  const autoCompaction = renderAutoCompactionStatus(theme, autoCompactionMode);
  const usage = getContextUsageSnapshot(ctx);
  const contextWindow = usage?.contextWindow ?? ctx.model?.contextWindow ?? 0;
  if (contextWindow <= 0) {
    return `${theme.fg("dim", "--/--")} ${autoCompaction}`;
  }

  const usedPercent = getContextPercent(usage);
  const usedPercentValue = usedPercent ?? 0;
  const remainingPercentValue = Math.min(100, Math.max(0, 100 - usedPercentValue));
  const remainingPercentText = usedPercent === null ? "?" : remainingPercentValue.toFixed(1);
  const statusText = `${remainingPercentText}%/${formatTokens(contextWindow)}`;

  const remaining =
    typeof usedPercent === "number"
      ? Math.min(1, Math.max(0, remainingPercentValue / 100))
      : undefined;
  const color = getContextDisplayColorFromStatus(getContextStatusFromRemaining(remaining)) ?? "dim";

  return `${theme.fg(color, statusText)} ${autoCompaction}`;
}

const GIT_BRANCH_SYMBOL = "";

function toTildePath(path: string): string {
  const home = process.env.HOME;
  if (!home) return path;
  return path.startsWith(home) ? `~${path.slice(home.length)}` : path;
}

export function buildFooterPathLabel(cwd: string, branch?: string): string {
  const path = toTildePath(cwd);
  return branch ? `${path} • ${GIT_BRANCH_SYMBOL} ${branch}` : path;
}

export function buildHeaderModelLine(
  theme: Theme,
  modelLabel: string,
  contentWidth: number,
): string {
  const prefix = ` ${theme.fg("dim", "model:".padEnd(11))}`;
  const fullHint = `${theme.fg("accent", " /model")}${theme.fg("dim", " to change")}`;
  const shortHint = theme.fg("accent", " /model");

  const prefixWidth = visibleWidth(prefix);
  const availableWidth = Math.max(0, contentWidth - prefixWidth);
  const fullBody = `${modelLabel}${fullHint}`;
  if (visibleWidth(fullBody) <= availableWidth) {
    return fitVisible(`${prefix}${fullBody}`, contentWidth);
  }

  const shortBody = `${modelLabel}${shortHint}`;
  if (visibleWidth(shortBody) <= availableWidth) {
    return fitVisible(`${prefix}${shortBody}`, contentWidth);
  }

  return fitVisible(`${prefix}${truncateToWidth(modelLabel, availableWidth)}`, contentWidth);
}

export function refreshPiMixShellChrome(
  ctx: ExtensionContext,
  prefs: PiMixPrefs,
  getThinkingLevel: () => ThinkingLevel,
): void {
  const modelLabel = formatModelLabel(ctx.model, "no-model");
  const borderTone = resolveEditorBorderTone(ctx);

  configurePiMixEditorChrome({
    getLabel: () =>
      buildEditorBorderStatus(
        ctx.ui.theme,
        modelLabel,
        getThinkingLevel(),
        buildUsageCostIndicator(ctx.ui.theme, ctx),
      ),
    getBorderColor: (defaultBorderColor: (text: string) => string) =>
      resolveEditorBorderColorFromTone(borderTone, ctx.ui.theme, defaultBorderColor),
    paddingX: prefs.density === "comfortable" ? 1 : 0,
  });
}

export function applyPiMixUiShell(
  ctx: ExtensionContext,
  prefs: PiMixPrefs,
  getThinkingLevel: () => ThinkingLevel,
): void {
  const autoCompactionMode = getAutoCompactionMode(ctx.cwd);
  refreshPiMixShellChrome(ctx, prefs, getThinkingLevel);
  ctx.ui.setToolsExpanded(!prefs.compactTools);
  ctx.ui.setHeader(
    prefs.showHeader
      ? (_tui, theme) => ({
          invalidate() {},
          render(width: number): string[] {
            return profileRender("pimix.header.render", () => {
              const boxWidth = width >= 54 ? 50 : Math.max(24, width);
              const model = formatModelLabel(ctx.model, "no-model");
              const leftPad = "";
              const border = (text: string) => theme.fg("borderAccent", text);
              const top = leftPad + border(`╭${"─".repeat(Math.max(0, boxWidth - 2))}╮`);
              const line1 =
                leftPad +
                border("│") +
                fitVisible(
                  ` ${theme.fg("dim", ">_")} ${theme.bold("Pi-mix")} ${theme.fg("dim", `(v${PI_VERSION})`)}`,
                  boxWidth - 2,
                ) +
                border("│");
              const gap = leftPad + border("│") + fitVisible("", boxWidth - 2) + border("│");
              const line2 =
                leftPad +
                border("│") +
                buildHeaderModelLine(theme, model, boxWidth - 2) +
                border("│");
              const line3 =
                leftPad +
                border("│") +
                fitVisible(
                  ` ${theme.fg("dim", "directory:".padEnd(11))}${basename(ctx.cwd)}`,
                  boxWidth - 2,
                ) +
                border("│");
              const line4 =
                leftPad +
                border("│") +
                fitVisible(
                  ` ${theme.fg("dim", "path:".padEnd(11))}${toTildePath(ctx.cwd)}`,
                  boxWidth - 2,
                ) +
                border("│");
              const bottom = leftPad + border(`╰${"─".repeat(Math.max(0, boxWidth - 2))}╯`);
              return [top, line1, gap, line2, line3, line4, bottom];
            });
          },
        })
      : undefined,
  );
  ctx.ui.setFooter((_tui, theme, footerData) => ({
    invalidate() {},
    render(width: number): string[] {
      return profileRender("pimix.footer.render", () => {
        const branch = footerData.getGitBranch();
        const left = theme.fg("dim", buildFooterPathLabel(ctx.cwd, branch));
        const right = buildFooterRightStatus(theme, ctx, autoCompactionMode);
        const totalWidth = Math.max(1, width);
        const leftWidth = visibleWidth(left);
        const rightWidth = visibleWidth(right);
        const gapWidth = Math.max(1, totalWidth - leftWidth - rightWidth);
        if (leftWidth + 1 + rightWidth <= totalWidth) {
          return [left + " ".repeat(gapWidth) + right];
        }
        return [fitVisible(left, totalWidth), fitVisible(right, totalWidth)];
      });
    },
  }));
}
