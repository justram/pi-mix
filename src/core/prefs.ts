export type PiMixThemeName = "pi-mix-dark" | "pi-mix-light";
export type PiMixDensity = "compact" | "comfortable";
export type PiMixStatusColorName = "green" | "teal" | "blue" | "purple" | "amber" | "red" | "gray";
export type PiMixSyntaxPaletteName = "default" | "muted" | "contrast" | "warm" | "cool";

export interface PiMixPrefs {
  themeName: PiMixThemeName;
  density: PiMixDensity;
  forceTheme: boolean;
  showHeader: boolean;
  compactTools: boolean;
  statusSuccessColor: PiMixStatusColorName;
  statusWarningColor: PiMixStatusColorName;
  statusErrorColor: PiMixStatusColorName;
  syntaxPalette: PiMixSyntaxPaletteName;
}

export const PI_MIX_PREFS_ENTRY = "pimix-prefs";

export const DEFAULT_PREFS: PiMixPrefs = {
  themeName: "pi-mix-dark",
  density: "compact",
  forceTheme: true,
  showHeader: true,
  compactTools: true,
  statusSuccessColor: "green",
  statusWarningColor: "amber",
  statusErrorColor: "red",
  syntaxPalette: "default",
};

export type PiMixPrefsEntryLike = {
  type?: string;
  customType?: string;
  data?: unknown;
};

function isPiMixThemeName(value: unknown): value is PiMixThemeName {
  return value === "pi-mix-dark" || value === "pi-mix-light";
}

function isPiMixDensity(value: unknown): value is PiMixDensity {
  return value === "compact" || value === "comfortable";
}

function isPiMixStatusColorName(value: unknown): value is PiMixStatusColorName {
  return (
    value === "green" ||
    value === "teal" ||
    value === "blue" ||
    value === "purple" ||
    value === "amber" ||
    value === "red" ||
    value === "gray"
  );
}

function isPiMixSyntaxPaletteName(value: unknown): value is PiMixSyntaxPaletteName {
  return (
    value === "default" ||
    value === "muted" ||
    value === "contrast" ||
    value === "warm" ||
    value === "cool"
  );
}

export function normalizePrefs(input: unknown): PiMixPrefs {
  if (!input || typeof input !== "object") return { ...DEFAULT_PREFS };
  const source = input as Partial<PiMixPrefs>;
  return {
    themeName: isPiMixThemeName(source.themeName) ? source.themeName : DEFAULT_PREFS.themeName,
    density: isPiMixDensity(source.density) ? source.density : DEFAULT_PREFS.density,
    forceTheme: source.forceTheme ?? DEFAULT_PREFS.forceTheme,
    showHeader: source.showHeader ?? DEFAULT_PREFS.showHeader,
    compactTools: source.compactTools ?? DEFAULT_PREFS.compactTools,
    statusSuccessColor: isPiMixStatusColorName(source.statusSuccessColor)
      ? source.statusSuccessColor
      : DEFAULT_PREFS.statusSuccessColor,
    statusWarningColor: isPiMixStatusColorName(source.statusWarningColor)
      ? source.statusWarningColor
      : DEFAULT_PREFS.statusWarningColor,
    statusErrorColor: isPiMixStatusColorName(source.statusErrorColor)
      ? source.statusErrorColor
      : DEFAULT_PREFS.statusErrorColor,
    syntaxPalette: isPiMixSyntaxPaletteName(source.syntaxPalette)
      ? source.syntaxPalette
      : DEFAULT_PREFS.syntaxPalette,
  };
}

export function loadPrefs(entries: ReadonlyArray<PiMixPrefsEntryLike>): PiMixPrefs {
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry?.type === "custom" && entry.customType === PI_MIX_PREFS_ENTRY) {
      return normalizePrefs(entry.data);
    }
  }
  return { ...DEFAULT_PREFS };
}
