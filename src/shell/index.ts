import type { ThinkingLevel } from "@mariozechner/pi-agent-core";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";

import type { PiMixPrefs } from "../core/prefs";
import { applyPiMixUiShell } from "./ui-shell";

export * from "./auto-compaction";
export * from "./context-status";
export * from "./model-label";
export * from "./ui-shell";
export * from "./usage-cost";

export function installPiMixShell(
  ctx: ExtensionContext,
  prefs: PiMixPrefs,
  getThinkingLevel: () => ThinkingLevel,
): void {
  applyPiMixUiShell(ctx, prefs, getThinkingLevel);
}
