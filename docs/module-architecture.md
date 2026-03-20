# Pi-mix module architecture

Status: current repository structure.

## First principle

Treat `pi-mix` as one extension first.

The default install path is still just:

- `pi-mix`

That bundled entrypoint gives the normal Pi-mix experience:

- theme installation
- shell header and footer
- editor chrome patching
- `/pimix` settings

The rest of this document is mainly for repository maintainers and extension authors who want to compose only parts of Pi-mix.

## Why the internal split still exists

Even though the product is simpler now, the code still has a few real ownership boundaries:

- theme ownership
- shell header/footer ownership
- editor chrome ownership
- shared settings/helpers
- default bundle wiring

Those boundaries are worth keeping because the underlying Pi hooks are different and some are exclusive at runtime.

## Public entrypoints

### Default

- `pi-mix`

Use this unless you are intentionally building a custom composition.

### Advanced subpaths

- `pi-mix/theme`
- `pi-mix/shell`
- `pi-mix/editor`
- `pi-mix/core`

These are advanced entrypoints for custom wrappers and extension authors.

## Repository layout

### `entrypoints/`

Public package entrypoints exposed through `package.json.exports`:

- `entrypoints/index.ts`
- `entrypoints/theme.ts`
- `entrypoints/shell.ts`
- `entrypoints/editor.ts`
- `entrypoints/core.ts`

### `src/bundle/`

Default composition layer.

Responsibilities:

- assemble the normal Pi-mix experience
- restore and persist preferences
- register `/pimix`
- re-apply bundle-owned UI on session lifecycle events

### `src/core/`

Shared non-owning logic.

Responsibilities:

- preference types and defaults
- preference persistence and loading
- settings dialog construction
- shared profiling helpers

### `src/theme/`

Theme ownership surface.

Responsibilities:

- load bundled theme JSON
- build runtime color maps from preferences
- install the active Pi-mix runtime theme

Why it stays separate:

- it owns `ctx.ui.setTheme(...)`

### `src/shell/`

Shell chrome ownership surface.

Responsibilities:

- header and footer rendering
- model, context, and usage-cost display
- shell-level UI installation and refresh

Why it stays separate:

- it owns global header/footer UI

### `src/editor/`

Editor chrome ownership surface.

Responsibilities:

- editor chrome patching
- editor border label and border-color behavior
- shell/editor coordination for status presentation

Why it stays separate:

- it patches editor behavior directly

## Composition guidance

If you are not writing a custom wrapper, use the default bundle and stop here.

If you are composing selectively, these combinations are generally reasonable:

- `theme` only
- `theme` + `shell`
- `shell` + `editor`
- `core` with any of the above

Use caution when combining Pi-mix with other extensions that also own:

- global header/footer UI
- the editor component or editor internals
- theme installation

## Import guidance

New code should import from:

- public package subpaths in `entrypoints/`, or
- the current module folders in `src/`

Do not target historical flat paths from older layouts.

## Recommended files to inspect first

When continuing work:

- default extension wiring: `src/bundle/index.ts`
- shared prefs and settings: `src/core/index.ts`
- theme behavior: `src/theme/index.ts`
- shell behavior: `src/shell/index.ts`
- editor behavior: `src/editor/index.ts`

## Decision rule for future changes

Before adding a feature, decide where it belongs:

- shared additive logic: `core`
- theme behavior: `theme`
- header/footer behavior: `shell`
- editor chrome behavior: `editor`
- default integration and lifecycle wiring: `bundle`

If a feature touches multiple ownership surfaces, decide explicitly whether the integration should live only in `bundle`.
