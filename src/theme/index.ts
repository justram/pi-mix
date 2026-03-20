import type { ExtensionContext } from "@mariozechner/pi-coding-agent";

import type { PiMixPrefs } from "../core/prefs";
import { buildPiMixTheme } from "./theme-overrides";

export * from "./theme-overrides";

export function installPiMixTheme(ctx: ExtensionContext, prefs: PiMixPrefs): void {
  if (!prefs.forceTheme) {
    return;
  }

  ctx.ui.setTheme(buildPiMixTheme(prefs.themeName, prefs, ctx.ui.theme.getColorMode()));
}
