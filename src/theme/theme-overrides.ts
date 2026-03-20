import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Theme, type ThemeColor } from "@mariozechner/pi-coding-agent";

import type {
  PiMixPrefs,
  PiMixStatusColorName,
  PiMixSyntaxPaletteName,
  PiMixThemeName,
} from "../core/prefs";

type ThemeJson = {
  name?: string;
  vars?: Record<string, string>;
  colors: Record<string, string>;
};

type ThemeBg =
  | "selectedBg"
  | "userMessageBg"
  | "customMessageBg"
  | "toolPendingBg"
  | "toolSuccessBg"
  | "toolErrorBg";

export type RuntimeThemeColorMaps = {
  fg: Record<ThemeColor, string | number>;
  bg: Record<ThemeBg, string | number>;
};

type SyntaxPalette = Record<
  | "syntaxComment"
  | "syntaxKeyword"
  | "syntaxFunction"
  | "syntaxVariable"
  | "syntaxString"
  | "syntaxNumber"
  | "syntaxType"
  | "syntaxOperator"
  | "syntaxPunctuation",
  string
>;

const themeColorKeys = [
  "accent",
  "border",
  "borderAccent",
  "borderMuted",
  "success",
  "error",
  "warning",
  "muted",
  "dim",
  "text",
  "thinkingText",
  "userMessageText",
  "customMessageText",
  "customMessageLabel",
  "toolTitle",
  "toolOutput",
  "mdHeading",
  "mdLink",
  "mdLinkUrl",
  "mdCode",
  "mdCodeBlock",
  "mdCodeBlockBorder",
  "mdQuote",
  "mdQuoteBorder",
  "mdHr",
  "mdListBullet",
  "toolDiffAdded",
  "toolDiffRemoved",
  "toolDiffContext",
  "syntaxComment",
  "syntaxKeyword",
  "syntaxFunction",
  "syntaxVariable",
  "syntaxString",
  "syntaxNumber",
  "syntaxType",
  "syntaxOperator",
  "syntaxPunctuation",
  "thinkingOff",
  "thinkingMinimal",
  "thinkingLow",
  "thinkingMedium",
  "thinkingHigh",
  "thinkingXhigh",
  "bashMode",
] as const satisfies readonly ThemeColor[];

const themeBgKeys = [
  "selectedBg",
  "userMessageBg",
  "customMessageBg",
  "toolPendingBg",
  "toolSuccessBg",
  "toolErrorBg",
] as const satisfies readonly ThemeBg[];

const statusColorHex: Record<PiMixStatusColorName, string> = {
  green: "#9fd59f",
  teal: "#73daca",
  blue: "#7aa2f7",
  purple: "#bb9af7",
  amber: "#d2b48c",
  red: "#ff9a9a",
  gray: "#8a8a8a",
};

const syntaxPalettes: Record<PiMixSyntaxPaletteName, SyntaxPalette | null> = {
  default: null,
  muted: {
    syntaxComment: "#7c8593",
    syntaxKeyword: "#7a8fb8",
    syntaxFunction: "#b8c0cf",
    syntaxVariable: "#a5afc2",
    syntaxString: "#8eb57a",
    syntaxNumber: "#c69a6b",
    syntaxType: "#7eb3b1",
    syntaxOperator: "#b0bac9",
    syntaxPunctuation: "#8c98ac",
  },
  contrast: {
    syntaxComment: "#808b9d",
    syntaxKeyword: "#82aaff",
    syntaxFunction: "#d7def0",
    syntaxVariable: "#c0c9dd",
    syntaxString: "#a6e36e",
    syntaxNumber: "#ffb86c",
    syntaxType: "#78dce8",
    syntaxOperator: "#d7def0",
    syntaxPunctuation: "#9aa7bd",
  },
  warm: {
    syntaxComment: "#7a7f91",
    syntaxKeyword: "#c792ea",
    syntaxFunction: "#f2d5cf",
    syntaxVariable: "#f0c6c6",
    syntaxString: "#a6d189",
    syntaxNumber: "#ef9f76",
    syntaxType: "#e5c890",
    syntaxOperator: "#f2d5cf",
    syntaxPunctuation: "#babbc5",
  },
  cool: {
    syntaxComment: "#738091",
    syntaxKeyword: "#7dcfff",
    syntaxFunction: "#c0caf5",
    syntaxVariable: "#9eceff",
    syntaxString: "#73daca",
    syntaxNumber: "#ff9e64",
    syntaxType: "#2ac3de",
    syntaxOperator: "#c0caf5",
    syntaxPunctuation: "#9aa5ce",
  },
};

const themeJsonCache = new Map<PiMixThemeName, ThemeJson>();

function getThemesDir(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "themes");
}

function loadThemeJson(themeName: PiMixThemeName): ThemeJson {
  const cached = themeJsonCache.get(themeName);
  if (cached) return cached;
  const filePath = resolve(getThemesDir(), `${themeName}.json`);
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as ThemeJson;
  themeJsonCache.set(themeName, parsed);
  return parsed;
}

function resolveThemeValue(value: string, vars: Record<string, string>): string {
  if (!value) return value;
  return vars[value] ?? value;
}

export function getThemeSurfaceColor(themeName: PiMixThemeName): string {
  const base = loadThemeJson(themeName);
  const vars = base.vars ?? {};
  return resolveThemeValue(vars.surface ?? "", vars);
}

export function buildThemeColorMaps(
  themeName: PiMixThemeName,
  prefs: PiMixPrefs,
): RuntimeThemeColorMaps {
  const base = loadThemeJson(themeName);
  const vars = base.vars ?? {};
  const fg = Object.fromEntries(
    themeColorKeys.map((key) => [key, resolveThemeValue(base.colors[key] ?? "", vars)]),
  ) as Record<ThemeColor, string | number>;
  const bg = Object.fromEntries(
    themeBgKeys.map((key) => [key, resolveThemeValue(base.colors[key] ?? "", vars)]),
  ) as Record<ThemeBg, string | number>;

  fg.success = statusColorHex[prefs.statusSuccessColor];
  fg.warning = statusColorHex[prefs.statusWarningColor];
  fg.error = statusColorHex[prefs.statusErrorColor];
  fg.toolDiffAdded = fg.success;
  fg.toolDiffRemoved = fg.error;

  const syntaxPalette = syntaxPalettes[prefs.syntaxPalette];
  if (syntaxPalette) {
    for (const [key, value] of Object.entries(syntaxPalette)) {
      fg[key as keyof SyntaxPalette as ThemeColor] = value;
    }
  }

  return { fg, bg };
}

export function buildPiMixTheme(
  themeName: PiMixThemeName,
  prefs: PiMixPrefs,
  mode: "truecolor" | "256color" = "truecolor",
): Theme {
  const { fg, bg } = buildThemeColorMaps(themeName, prefs);
  return new Theme(fg, bg, mode, { name: `${themeName}-runtime` });
}
