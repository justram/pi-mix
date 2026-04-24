import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

import {
  DEFAULT_PREFS,
  PI_MIX_PREFS_ENTRY,
  loadPrefs,
  openPiMixSettingsDialog,
  type PiMixPrefs,
  type PiMixPrefsEntryLike,
} from "../core/index";
import { installPiMixEditorChromePatch } from "../editor/index";
import {
  invalidateContextUsageCache,
  installPiMixShell,
  recordUsageCostFromMessageEnd,
} from "../shell/index";
import { installPiMixTheme } from "../theme/index";

function persistPrefs(pi: ExtensionAPI, prefs: PiMixPrefs): void {
  pi.appendEntry(PI_MIX_PREFS_ENTRY, prefs);
}

function restorePrefs(ctx: ExtensionContext): PiMixPrefs {
  return loadPrefs(ctx.sessionManager.getBranch() as PiMixPrefsEntryLike[]);
}

function installPiMixBundle(pi: ExtensionAPI, ctx: ExtensionContext, prefs: PiMixPrefs): void {
  installPiMixTheme(ctx, prefs);
  installPiMixShell(ctx, prefs, () => pi.getThinkingLevel());
}

function refreshPiMixBundle(pi: ExtensionAPI, ctx: ExtensionContext): PiMixPrefs {
  const nextPrefs = restorePrefs(ctx);
  installPiMixBundle(pi, ctx, nextPrefs);
  return nextPrefs;
}

function updatePrefs(pi: ExtensionAPI, ctx: ExtensionContext, nextPrefs: PiMixPrefs): PiMixPrefs {
  persistPrefs(pi, nextPrefs);
  installPiMixBundle(pi, ctx, nextPrefs);
  return nextPrefs;
}

function arePrefsEqual(left: PiMixPrefs, right: PiMixPrefs): boolean {
  return (
    left.themeName === right.themeName &&
    left.density === right.density &&
    left.forceTheme === right.forceTheme &&
    left.showHeader === right.showHeader &&
    left.compactTools === right.compactTools &&
    left.statusSuccessColor === right.statusSuccessColor &&
    left.statusWarningColor === right.statusWarningColor &&
    left.statusErrorColor === right.statusErrorColor &&
    left.syntaxPalette === right.syntaxPalette
  );
}

async function showPiMixSettings(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  getPrefs: () => PiMixPrefs,
  setPrefs: (nextPrefs: PiMixPrefs, ctx: ExtensionContext) => void,
): Promise<void> {
  const currentPrefs = getPrefs();
  const nextPrefs = await openPiMixSettingsDialog(ctx, currentPrefs);
  if (arePrefsEqual(nextPrefs, currentPrefs)) {
    return;
  }
  setPrefs(nextPrefs, ctx);
}

export default function piMixExtension(pi: ExtensionAPI): void {
  installPiMixEditorChromePatch();
  let prefs: PiMixPrefs = { ...DEFAULT_PREFS };

  const resetContextUsage = (ctx: ExtensionContext): void => {
    invalidateContextUsageCache(ctx);
  };
  const refreshShellChrome = (ctx: ExtensionContext): void => {
    installPiMixBundle(pi, ctx, prefs);
  };
  const refreshContextSensitiveChrome = (ctx: ExtensionContext): void => {
    resetContextUsage(ctx);
    refreshShellChrome(ctx);
  };

  pi.registerCommand("pimix", {
    description: "Open Pi-mix settings",
    handler: async (_args, ctx) => {
      await showPiMixSettings(
        pi,
        ctx,
        () => prefs,
        (nextPrefs, settingsCtx) => {
          prefs = updatePrefs(pi, settingsCtx, nextPrefs);
        },
      );
    },
  });

  pi.on("session_start", async (_event, ctx) => {
    resetContextUsage(ctx);
    prefs = refreshPiMixBundle(pi, ctx);
  });

  pi.on("resources_discover", async (_event, ctx) => {
    refreshContextSensitiveChrome(ctx);
  });

  pi.on("session_switch", async (_event, ctx) => {
    resetContextUsage(ctx);
    prefs = refreshPiMixBundle(pi, ctx);
  });

  pi.on("session_fork", async (_event, ctx) => {
    resetContextUsage(ctx);
    prefs = refreshPiMixBundle(pi, ctx);
  });

  pi.on("session_tree", async (_event, ctx) => {
    resetContextUsage(ctx);
    prefs = refreshPiMixBundle(pi, ctx);
  });

  pi.on("session_compact", async (_event, ctx) => {
    refreshContextSensitiveChrome(ctx);
  });

  pi.on("model_select", async (_event, ctx) => {
    refreshContextSensitiveChrome(ctx);
  });

  pi.on("message_end", async (event, ctx) => {
    if (event.message.role === "assistant") {
      recordUsageCostFromMessageEnd(ctx, event.message);
    }
    refreshContextSensitiveChrome(ctx);
  });

  pi.on("agent_start", async (_event, ctx) => {
    resetContextUsage(ctx);
  });

  pi.on("agent_end", async (_event, ctx) => {
    refreshContextSensitiveChrome(ctx);
  });
}
