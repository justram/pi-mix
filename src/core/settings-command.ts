import {
  DynamicBorder,
  getSelectListTheme,
  getSettingsListTheme,
  type ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import {
  Container,
  type Component,
  SelectList,
  type SelectItem,
  SettingsList,
  Spacer,
  type SettingItem,
  Text,
} from "@mariozechner/pi-tui";

import type {
  PiMixDensity,
  PiMixPrefs,
  PiMixStatusColorName,
  PiMixSyntaxPaletteName,
  PiMixThemeName,
} from "./prefs";

const PREF_THEME = "themeName";
const PREF_DENSITY = "density";
const PREF_FORCE_THEME = "forceTheme";
const PREF_SHOW_HEADER = "showHeader";
const PREF_COMPACT_TOOLS = "compactTools";
const PREF_STATUS_SUCCESS = "statusSuccessColor";
const PREF_STATUS_WARNING = "statusWarningColor";
const PREF_STATUS_ERROR = "statusErrorColor";
const PREF_SYNTAX_PALETTE = "syntaxPalette";

const SUBMENU_SETTING_IDS = new Set<PiMixPrefSettingId>([
  PREF_THEME,
  PREF_DENSITY,
  PREF_STATUS_SUCCESS,
  PREF_STATUS_WARNING,
  PREF_STATUS_ERROR,
  PREF_SYNTAX_PALETTE,
]);

type PiMixPrefSettingId =
  | typeof PREF_THEME
  | typeof PREF_DENSITY
  | typeof PREF_FORCE_THEME
  | typeof PREF_SHOW_HEADER
  | typeof PREF_COMPACT_TOOLS
  | typeof PREF_STATUS_SUCCESS
  | typeof PREF_STATUS_WARNING
  | typeof PREF_STATUS_ERROR
  | typeof PREF_SYNTAX_PALETTE;

export type PiMixSettingChoice = {
  value: string;
  label?: string;
  description?: string;
};

export interface PiMixSettingConfig {
  id: PiMixPrefSettingId;
  label: string;
  description: string;
  currentValue: string;
  options: readonly PiMixSettingChoice[];
}

function toThemeValue(themeName: PiMixThemeName): string {
  return themeName === "pi-mix-light" ? "light" : "dark";
}

function toDensityValue(density: PiMixDensity): string {
  return density;
}

function toToggleValue(enabled: boolean): string {
  return enabled ? "on" : "off";
}

function toStatusColorValue(value: PiMixStatusColorName): string {
  return value;
}

function toSyntaxPaletteValue(value: PiMixSyntaxPaletteName): string {
  return value;
}

function usesSubmenu(id: PiMixPrefSettingId): boolean {
  return SUBMENU_SETTING_IDS.has(id);
}

function buildSelectItems(options: readonly PiMixSettingChoice[]): SelectItem[] {
  return options.map((option) => ({
    value: option.value,
    label: option.label ?? option.value,
    ...(option.description ? { description: option.description } : {}),
  }));
}

function renderSummaryLine(
  theme: ExtensionContext["ui"]["theme"],
  parts: ReadonlyArray<[label: string, value: string]>,
): string {
  return parts
    .map(([label, value]) => `${theme.fg("dim", `${label}:`)} ${theme.fg("accent", value)}`)
    .join(theme.fg("dim", " • "));
}

function buildDialogSummary(theme: ExtensionContext["ui"]["theme"], prefs: PiMixPrefs): string {
  const line1 = renderSummaryLine(theme, [
    ["theme", toThemeValue(prefs.themeName)],
    ["density", toDensityValue(prefs.density)],
    ["header", toToggleValue(prefs.showHeader)],
  ]);
  const line2 = renderSummaryLine(theme, [
    [
      "status",
      `${toStatusColorValue(prefs.statusSuccessColor)}/${toStatusColorValue(prefs.statusWarningColor)}/${toStatusColorValue(prefs.statusErrorColor)}`,
    ],
    ["palette", toSyntaxPaletteValue(prefs.syntaxPalette)],
    ["tools", prefs.compactTools ? "collapsed" : "expanded"],
  ]);
  return `${line1}\n${line2}`;
}

function createSelectSubmenu(
  ctx: ExtensionContext,
  title: string,
  description: string,
  options: readonly PiMixSettingChoice[],
  currentValue: string,
  done: (selectedValue?: string) => void,
): Component {
  const container = new Container();
  const titleText = new Text("", 0, 0);
  const descriptionText = new Text("", 0, 0);
  const hintText = new Text("", 0, 0);
  const selectList = new SelectList(
    buildSelectItems(options),
    Math.min(options.length, 10),
    getSelectListTheme(),
  );

  function refreshChrome(): void {
    const theme = ctx.ui.theme;
    titleText.setText(theme.fg("accent", theme.bold(title)));
    descriptionText.setText(theme.fg("dim", description));
    hintText.setText(theme.fg("dim", "Enter to choose • Esc to go back"));
  }

  const currentIndex = options.findIndex((option) => option.value === currentValue);
  if (currentIndex >= 0) {
    selectList.setSelectedIndex(currentIndex);
  }

  selectList.onSelect = (item) => {
    done(item.value);
  };
  selectList.onCancel = () => {
    done();
  };

  refreshChrome();

  container.addChild(titleText);
  container.addChild(new Spacer(1));
  container.addChild(descriptionText);
  container.addChild(new Spacer(1));
  container.addChild(selectList);
  container.addChild(new Spacer(1));
  container.addChild(hintText);

  return {
    render(width: number): string[] {
      return container.render(width);
    },
    invalidate(): void {
      refreshChrome();
      container.invalidate();
    },
    handleInput(data: string): void {
      selectList.handleInput(data);
    },
  };
}

export function buildPiMixSettingConfigs(prefs: PiMixPrefs): PiMixSettingConfig[] {
  return [
    {
      id: PREF_THEME,
      label: "Theme",
      description:
        "Pick the Pi-mix color theme variant. This sets the base palette before any Pi-mix appearance overrides are applied.",
      currentValue: toThemeValue(prefs.themeName),
      options: [
        {
          value: "dark",
          description: "Dark Pi-mix palette with black tool surfaces and low-noise accents.",
        },
        {
          value: "light",
          description:
            "Light Pi-mix palette for bright terminals while keeping the same compact look.",
        },
      ],
    },
    {
      id: PREF_DENSITY,
      label: "Density",
      description:
        "Compact fits more on screen. Comfortable adds spacing in the editor for easier reading.",
      currentValue: toDensityValue(prefs.density),
      options: [
        { value: "compact", description: "Tighter layout with less horizontal padding." },
        {
          value: "comfortable",
          description: "Looser layout with more breathing room in the editor.",
        },
      ],
    },
    {
      id: PREF_FORCE_THEME,
      label: "Force theme",
      description:
        "When on, Pi-mix applies the selected Pi-mix base theme plus appearance overrides like status colors and the code preview palette. Turn it off to keep another Pi theme.",
      currentValue: toToggleValue(prefs.forceTheme),
      options: [{ value: "on" }, { value: "off" }],
    },
    {
      id: PREF_STATUS_SUCCESS,
      label: "Good color",
      description:
        "Color used for the healthy context battery state and the editor border when context usage is in a good range.",
      currentValue: toStatusColorValue(prefs.statusSuccessColor),
      options: [
        { value: "green" },
        { value: "teal" },
        { value: "blue" },
        { value: "purple" },
        { value: "amber" },
        { value: "red" },
        { value: "gray" },
      ],
    },
    {
      id: PREF_STATUS_WARNING,
      label: "Warning color",
      description:
        "Color used for the warning context battery state and the editor border when context usage gets tighter.",
      currentValue: toStatusColorValue(prefs.statusWarningColor),
      options: [
        { value: "amber" },
        { value: "purple" },
        { value: "blue" },
        { value: "teal" },
        { value: "green" },
        { value: "red" },
        { value: "gray" },
      ],
    },
    {
      id: PREF_STATUS_ERROR,
      label: "Error color",
      description:
        "Color used for the critical context battery state and the editor border when context usage is close to full.",
      currentValue: toStatusColorValue(prefs.statusErrorColor),
      options: [
        { value: "red" },
        { value: "amber" },
        { value: "purple" },
        { value: "blue" },
        { value: "teal" },
        { value: "green" },
        { value: "gray" },
      ],
    },
    {
      id: PREF_SYNTAX_PALETTE,
      label: "Code preview palette",
      description:
        "Choose the syntax-highlighting palette used for Pi-mix code previews in wrapped tool output such as read, write, and grep. This applies when Force theme is on.",
      currentValue: toSyntaxPaletteValue(prefs.syntaxPalette),
      options: [
        { value: "default", description: "Use the base Pi-mix syntax colors." },
        { value: "muted", description: "Lower-contrast syntax colors for quieter previews." },
        { value: "contrast", description: "Stronger separation between token types." },
        { value: "warm", description: "Warmer code colors with amber and rose accents." },
        { value: "cool", description: "Cooler code colors with blue and cyan accents." },
      ],
    },
    {
      id: PREF_SHOW_HEADER,
      label: "Header",
      description:
        "Show the top Pi-mix status card with version, model, and current directory. Turn it off for more transcript space.",
      currentValue: toToggleValue(prefs.showHeader),
      options: [{ value: "on" }, { value: "off" }],
    },
    {
      id: PREF_COMPACT_TOOLS,
      label: "Compact tools",
      description:
        "When on, tool outputs start collapsed so the transcript stays shorter. Turn it off to expand tool output by default.",
      currentValue: toToggleValue(prefs.compactTools),
      options: [{ value: "on" }, { value: "off" }],
    },
  ];
}

export function applyPiMixSettingValue(
  prefs: PiMixPrefs,
  id: PiMixPrefSettingId,
  value: string,
): PiMixPrefs {
  switch (id) {
    case PREF_THEME:
      return { ...prefs, themeName: value === "light" ? "pi-mix-light" : "pi-mix-dark" };
    case PREF_DENSITY:
      return { ...prefs, density: value === "comfortable" ? "comfortable" : "compact" };
    case PREF_FORCE_THEME:
      return { ...prefs, forceTheme: value === "on" };
    case PREF_SHOW_HEADER:
      return { ...prefs, showHeader: value === "on" };
    case PREF_COMPACT_TOOLS:
      return { ...prefs, compactTools: value === "on" };
    case PREF_STATUS_SUCCESS:
      return { ...prefs, statusSuccessColor: value as PiMixStatusColorName };
    case PREF_STATUS_WARNING:
      return { ...prefs, statusWarningColor: value as PiMixStatusColorName };
    case PREF_STATUS_ERROR:
      return { ...prefs, statusErrorColor: value as PiMixStatusColorName };
    case PREF_SYNTAX_PALETTE:
      return { ...prefs, syntaxPalette: value as PiMixSyntaxPaletteName };
    default:
      return prefs;
  }
}

export async function openPiMixSettingsDialog(
  ctx: ExtensionContext,
  initialPrefs: PiMixPrefs,
): Promise<PiMixPrefs> {
  return ctx.ui.custom((tui, _theme, _keybindings, done) => {
    let draftPrefs = { ...initialPrefs };

    const container = new Container();
    const titleText = new Text("", 0, 0);
    const introText = new Text("", 0, 0);
    const summaryText = new Text("", 0, 0);

    function refreshChrome(): void {
      const theme = ctx.ui.theme;
      titleText.setText(theme.fg("accent", theme.bold("Pi-mix settings")));
      introText.setText(
        [
          theme.fg("dim", "Stage Pi-mix changes here, then press Esc to apply them."),
          theme.fg("dim", "Search by label. Enter opens a picker for richer settings."),
        ].join("\n"),
      );
      summaryText.setText(buildDialogSummary(theme, draftPrefs));
    }

    function updateDraftPrefs(nextPrefs: PiMixPrefs): void {
      draftPrefs = nextPrefs;
      refreshChrome();
    }

    function applyDraftSettingValue(id: PiMixPrefSettingId, value: string): void {
      updateDraftPrefs(applyPiMixSettingValue(draftPrefs, id, value));
    }

    function createDialogItems(): SettingItem[] {
      return buildPiMixSettingConfigs(draftPrefs).map((config) => {
        const item: SettingItem = {
          id: config.id,
          label: config.label,
          description: config.description,
          currentValue: config.currentValue,
        };

        if (usesSubmenu(config.id)) {
          item.submenu = (currentValue, submenuDone) =>
            createSelectSubmenu(
              ctx,
              config.label,
              config.description,
              config.options,
              currentValue,
              submenuDone,
            );
        } else {
          item.values = config.options.map((option) => option.value);
        }

        return item;
      });
    }

    refreshChrome();

    container.addChild(new DynamicBorder((text: string) => ctx.ui.theme.fg("accent", text)));
    container.addChild(titleText);
    container.addChild(new Spacer(1));
    container.addChild(introText);
    container.addChild(new Spacer(1));
    container.addChild(summaryText);
    container.addChild(new Spacer(1));

    const settingsList = new SettingsList(
      createDialogItems(),
      Math.min(buildPiMixSettingConfigs(draftPrefs).length + 2, 12),
      getSettingsListTheme(),
      (id, newValue) => {
        applyDraftSettingValue(id as PiMixPrefSettingId, newValue);
      },
      () => {
        done(draftPrefs);
      },
      { enableSearch: true },
    );

    container.addChild(settingsList);
    container.addChild(new Spacer(1));
    container.addChild(new DynamicBorder((text: string) => ctx.ui.theme.fg("accent", text)));

    return {
      render(width: number): string[] {
        return container.render(width);
      },
      invalidate(): void {
        refreshChrome();
        container.invalidate();
      },
      handleInput(data: string): void {
        settingsList.handleInput(data);
      },
    };
  });
}
