import {
  CustomEditor,
  InteractiveMode,
  type ExtensionContext,
  type KeybindingsManager,
  type Theme,
  type ThemeColor,
} from "@mariozechner/pi-coding-agent";
import {
  truncateToWidth,
  visibleWidth,
  type EditorOptions,
  type EditorTheme,
  type TUI,
} from "@mariozechner/pi-tui";

import { getContextDisplayColor } from "../shell/context-status";
import type { PiMixPrefs } from "../core/prefs";
import { profileRender } from "../core/render-profiler";

const ANSI_COLOR_PATTERN = new RegExp(String.raw`\u001b\[[0-9;]*m`, "g");
const PI_MIX_EDITOR_PATCHED = Symbol.for("pi-mix.editor.chrome-patched");
const PI_MIX_EDITOR_STATE = Symbol.for("pi-mix.editor.chrome-state");
const PI_MIX_EDITOR_FACTORY_PATCHED = Symbol.for("pi-mix.editor.chrome-factory-patched");
const PI_MIX_INTERACTIVE_MODE_PATCHED = Symbol.for("pi-mix.interactive-mode.editor-chrome-patched");

let piMixEditorChromeVersion = 0;
let piMixEditorChromeConfig:
  | {
      version: number;
      getLabel: () => string | undefined;
      getBorderColor: (defaultBorderColor: (text: string) => string) => (text: string) => string;
      paddingX: number;
    }
  | undefined;

type PatchedEditorState = {
  appliedVersion: number;
  defaultBorderColor: (text: string) => string;
  getBorderColor: () => (text: string) => string;
  setBorderColor: (borderColor: (text: string) => string) => void;
  getCachedTopBorderLine: (cacheKey: string) => string | undefined;
  setCachedTopBorderLine: (cacheKey: string, line: string) => void;
};

type EditorWithPiMixChrome = {
  render(width: number): string[];
  borderColor?: (text: string) => string;
  setPaddingX?: (padding: number) => void;
  getPaddingX?: () => number;
  tui?: { requestRender?: () => void };
  [PI_MIX_EDITOR_PATCHED]?: boolean;
  [PI_MIX_EDITOR_STATE]?: PatchedEditorState;
};

type EditorFactory = (...args: unknown[]) => EditorWithPiMixChrome;

type InteractiveModeWithCustomEditor = {
  defaultEditor?: EditorWithPiMixChrome;
  editor?: EditorWithPiMixChrome;
  renderInitialMessages: () => void;
  setCustomEditorComponent: (factory?: EditorFactory) => void;
  [PI_MIX_INTERACTIVE_MODE_PATCHED]?: boolean;
};

export function resolveEditorBorderTone(ctx: ExtensionContext): ThemeColor | undefined {
  return getContextDisplayColor(ctx);
}

export function resolveEditorBorderColorFromTone(
  tone: ThemeColor | undefined,
  theme: Theme,
  defaultBorderColor: (text: string) => string,
): (text: string) => string {
  if (tone == null) {
    return defaultBorderColor;
  }

  return (text: string) => theme.fg(tone, text);
}

export function resolveEditorBorderColor(
  ctx: ExtensionContext,
  theme: Theme,
  defaultBorderColor: (text: string) => string,
): (text: string) => string {
  return resolveEditorBorderColorFromTone(resolveEditorBorderTone(ctx), theme, defaultBorderColor);
}

function stripAnsi(text: string): string {
  return text.replace(ANSI_COLOR_PATTERN, "");
}

export function renderEditorBorderLabel(options: {
  lines: string[];
  width: number;
  label: string;
  borderColor: (text: string) => string;
  labelColor: (text: string) => string;
  getCachedTopBorderLine?: (cacheKey: string) => string | undefined;
  setCachedTopBorderLine?: (cacheKey: string, line: string) => void;
  cacheVersion?: number;
}): string[] {
  const {
    lines,
    width,
    label,
    borderColor,
    labelColor,
    getCachedTopBorderLine,
    setCachedTopBorderLine,
    cacheVersion = 0,
  } = options;
  if (lines.length === 0 || width <= 0 || label.length === 0) return lines;

  const topLine = lines[0] ?? "";
  const cacheKey = `${cacheVersion}\u241f${width}\u241f${label}\u241f${topLine}`;
  const cachedTopLine = getCachedTopBorderLine?.(cacheKey);
  if (cachedTopLine) {
    lines[0] = cachedTopLine;
    return lines;
  }

  const topPlain = stripAnsi(topLine);
  const scrollPrefixMatch = topPlain.match(/^(─── ↑ \d+ more )/);
  const prefix = scrollPrefixMatch?.[1] ?? "──";
  const labelLeftSpace = prefix.endsWith(" ") ? "" : " ";
  const labelRightSpace = " ";
  const maxLabelWidth = Math.max(
    0,
    width - visibleWidth(prefix) - visibleWidth(labelLeftSpace) - visibleWidth(labelRightSpace) - 1,
  );
  if (maxLabelWidth <= 0) return lines;

  const fittedLabel = truncateToWidth(label, maxLabelWidth);
  const labelChunk = `${labelLeftSpace}${fittedLabel}${labelRightSpace}`;
  const remaining = Math.max(0, width - visibleWidth(prefix) - visibleWidth(labelChunk));
  const right = "─".repeat(remaining);
  const renderedTopLine = `${borderColor(prefix)}${labelColor(labelChunk)}${borderColor(right)}`;

  lines[0] = renderedTopLine;
  setCachedTopBorderLine?.(cacheKey, renderedTopLine);
  return lines;
}

function createPatchedEditorState(editor: EditorWithPiMixChrome): PatchedEditorState {
  const initialBorderColor = editor.borderColor ?? ((text: string) => text);
  let currentBorderColor = initialBorderColor;
  let cachedTopBorderLine:
    | {
        key: string;
        line: string;
      }
    | undefined;

  delete (editor as { borderColor?: (text: string) => string }).borderColor;
  Object.defineProperty(editor, "borderColor", {
    get: () => currentBorderColor,
    set: () => {
      // Border ownership stays with Pi-mix once the editor is patched.
    },
    configurable: true,
    enumerable: true,
  });

  return {
    appliedVersion: -1,
    defaultBorderColor: initialBorderColor,
    getBorderColor: () => currentBorderColor,
    setBorderColor: (borderColor: (text: string) => string) => {
      currentBorderColor = borderColor;
      cachedTopBorderLine = undefined;
    },
    getCachedTopBorderLine: (cacheKey: string) =>
      cachedTopBorderLine?.key === cacheKey ? cachedTopBorderLine.line : undefined,
    setCachedTopBorderLine: (cacheKey: string, line: string) => {
      cachedTopBorderLine = { key: cacheKey, line };
    },
  };
}

export function patchPiMixEditorChrome(editor: EditorWithPiMixChrome): EditorWithPiMixChrome {
  if (editor[PI_MIX_EDITOR_PATCHED]) return editor;

  const state = createPatchedEditorState(editor);
  editor[PI_MIX_EDITOR_STATE] = state;

  const originalRender = editor.render.bind(editor);
  editor.render = (width: number): string[] =>
    profileRender("pimix.editor.render", () => {
      const chrome = piMixEditorChromeConfig;
      if (chrome && state.appliedVersion !== chrome.version) {
        if (
          typeof editor.setPaddingX === "function" &&
          editor.getPaddingX?.() !== chrome.paddingX
        ) {
          editor.setPaddingX(chrome.paddingX);
        }
        state.setBorderColor(chrome.getBorderColor(state.defaultBorderColor));
        state.appliedVersion = chrome.version;
      }

      const lines = originalRender(width);
      const label = chrome?.getLabel();
      if (!label) return lines;

      return renderEditorBorderLabel({
        lines,
        width,
        label,
        borderColor: state.getBorderColor(),
        labelColor: (text: string) => text,
        getCachedTopBorderLine: state.getCachedTopBorderLine,
        setCachedTopBorderLine: state.setCachedTopBorderLine,
        cacheVersion: state.appliedVersion,
      });
    });

  editor[PI_MIX_EDITOR_PATCHED] = true;
  return editor;
}

function wrapEditorFactory(factory: EditorFactory): EditorFactory {
  const patchedFactory = factory as EditorFactory & {
    [PI_MIX_EDITOR_FACTORY_PATCHED]?: boolean;
  };
  if (patchedFactory[PI_MIX_EDITOR_FACTORY_PATCHED]) return factory;

  const wrappedFactory = ((...args: unknown[]) =>
    patchPiMixEditorChrome(factory(...args))) as EditorFactory & {
    [PI_MIX_EDITOR_FACTORY_PATCHED]?: boolean;
  };
  wrappedFactory[PI_MIX_EDITOR_FACTORY_PATCHED] = true;
  return wrappedFactory;
}

function patchInteractiveModeEditors(mode: InteractiveModeWithCustomEditor): void {
  if (mode.defaultEditor) {
    patchPiMixEditorChrome(mode.defaultEditor);
  }
  if (mode.editor && mode.editor !== mode.defaultEditor) {
    patchPiMixEditorChrome(mode.editor);
  }
}

export function configurePiMixEditorChrome(options: {
  getLabel: () => string | undefined;
  getBorderColor: (defaultBorderColor: (text: string) => string) => (text: string) => string;
  paddingX: number;
}): void {
  piMixEditorChromeVersion += 1;
  piMixEditorChromeConfig = {
    version: piMixEditorChromeVersion,
    ...options,
  };
}

export function resetPiMixEditorChromeForTests(): void {
  piMixEditorChromeVersion = 0;
  piMixEditorChromeConfig = undefined;
}

export function installPiMixEditorChromePatch(): void {
  const prototype = InteractiveMode.prototype as unknown as InteractiveModeWithCustomEditor;
  if (prototype[PI_MIX_INTERACTIVE_MODE_PATCHED]) return;

  const originalRenderInitialMessages = prototype.renderInitialMessages;
  prototype.renderInitialMessages = function (this: InteractiveModeWithCustomEditor): void {
    patchInteractiveModeEditors(this);
    originalRenderInitialMessages.call(this);
  };

  const originalSetCustomEditorComponent = prototype.setCustomEditorComponent;
  prototype.setCustomEditorComponent = function (
    this: InteractiveModeWithCustomEditor,
    factory?: EditorFactory,
  ): void {
    patchInteractiveModeEditors(this);
    originalSetCustomEditorComponent.call(this, factory ? wrapEditorFactory(factory) : undefined);
    patchInteractiveModeEditors(this);
  };
  prototype[PI_MIX_INTERACTIVE_MODE_PATCHED] = true;
}

export class PiMixEditor extends CustomEditor {
  constructor(
    tui: TUI,
    theme: EditorTheme,
    keybindings: KeybindingsManager,
    _ctx: ExtensionContext,
    options?: EditorOptions,
  ) {
    super(tui, theme, keybindings, options);
    patchPiMixEditorChrome(this as unknown as EditorWithPiMixChrome);
  }

  setPrefs(prefs: PiMixPrefs): void {
    this.setPaddingX(prefs.density === "comfortable" ? 1 : 0);
  }

  requestRenderNow(): void {
    this.tui.requestRender();
  }
}
