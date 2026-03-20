<div align="center">

# pi-mix

[![License](https://img.shields.io/badge/license-MIT-111111?style=flat-square)](./LICENSE)
[![Pi package](https://img.shields.io/badge/pi-package-111111?style=flat-square)](https://pi.dev)

_Pi-mix is my UI preset inspired by Pi-dex_

</div>

## Install

Use whichever source you prefer:

```bash
pi install npm:@justram/pi-mix
# or
pi install /absolute/path/to/pi-mix
```

For local development only:

```bash
npm install
pi -e .
```

## What you get

`pi-mix` is now primarily a UI extension for Pi. Install it as one package and it gives you:

- bundled Pi-mix dark/light themes
- a custom header and footer
- custom editor chrome
- the `/pimix` appearance settings dialog
- Pi's native built-in tools, unchanged

For most users, that is the whole story: install `pi-mix`, use `/pimix`, and treat it as one cohesive extension.

## Command

- `/pimix` - open the Pi-mix settings dialog and change Pi-mix preferences

## Advanced usage

Pi-mix also exposes programmatic subpath entrypoints for advanced extension authors and custom wrappers.

If you are not writing your own Pi extension in code, you do not need any of that. Install `@justram/pi-mix` and use `/pimix`.

Implementation and composition details live in `docs/module-architecture.md`.

## Repository layout

- `entrypoints/` - public package entrypoints exposed through `package.json.exports`
- `src/` - implementation split by concern (`theme`, `shell`, `editor`, shared settings/helpers, bundle wiring)
- `themes/` - bundled theme JSON files
- `docs/` - reference docs

If you are working inside this repository, start with `docs/module-architecture.md`, then inspect the relevant `src/` area.

## Development

This repository uses npm for local dependency management and lockfile updates.

```bash
npm install
npm run format
npm run lint
npm run typecheck
npm run pack:dry
```

## Notes

- Pi-mix targets the extension boundary, so some Codex-like UI details are approximations rather than renderer-core replacements.
- Appearance settings are documented in `docs/appearance-settings.md`.
- Internal composition details are documented in `docs/module-architecture.md`.
