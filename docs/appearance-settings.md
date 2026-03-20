# Pi-mix appearance settings

## Overview

Pi-mix exposes its user-facing visual controls through `/pimix`.

The settings are intentionally preset-based. Pi-mix is trying to stay fast to configure and easy to reason about, not become a fully freeform theme editor.

## Open the settings dialog

```text
/pimix
```

Inside the dialog:

- search by setting label
- use Enter to open pickers for richer value lists
- use Esc to apply the staged changes and close the dialog

## Available settings

### Theme

Base Pi-mix theme variant:

- `dark`
- `light`

This chooses the bundled Pi-mix palette that runtime overrides build on top of.

### Density

Controls editor spacing.

Values:

- `compact`
- `comfortable`

Intent:

- `compact` fits more on screen
- `comfortable` adds more breathing room in the editor

### Force theme

Values:

- `on`
- `off`

When this is `on`, Pi-mix applies the selected Pi-mix base theme plus its runtime appearance overrides.

When this is `off`, Pi-mix stops forcing a Pi-mix theme and leaves the active Pi theme alone.

Current limitation:

- this toggle controls whether Pi-mix actively applies its theme path
- Pi-mix-specific color overrides such as status colors and code preview palettes are only guaranteed when forced theme is on

### Good color

Controls the semantic success color.

### Warning color

Controls the semantic warning color.

### Error color

Controls the semantic error color.

Available values for all three:

- `green`
- `teal`
- `blue`
- `purple`
- `amber`
- `red`
- `gray`

These semantic colors feed Pi-mix runtime theme slots such as:

- footer context status
- editor border status
- diff accent colors that reuse success/error slots

### Code preview palette

Controls the syntax-highlighting palette used by Pi-mix code surfaces.

Values:

- `default`
- `muted`
- `contrast`
- `warm`
- `cool`

This affects Pi-mix-controlled syntax-colored UI surfaces that use the runtime theme palette.

This does not change:

- model behavior
- native Pi tool behavior
- file contents
- non-syntax transcript styling controlled by Pi itself

### Header

Values:

- `on`
- `off`

Controls whether Pi-mix renders its top status card.

When enabled, the header shows compact session context such as:

- model label
- current working directory
- full path
- Pi version

Turn it off if you want more transcript space.

### Compact tools

Values:

- `on`
- `off`

Controls the default expansion state for tool results.

- `on`: tool output starts collapsed for a denser transcript
- `off`: tool output starts expanded by default

## Design intent

Pi-mix intentionally exposes a small set of high-value controls:

- bundled dark/light base theme
- density
- semantic status colors
- syntax palette tuning for Pi-mix-controlled code surfaces
- header visibility
- default tool compactness

That keeps `/pimix` useful as a quick operator-facing settings surface without turning the extension into a broad customization framework.

## Related docs

- module layout and entrypoints: `docs/module-architecture.md`
