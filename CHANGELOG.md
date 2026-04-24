# Changelog

## Unreleased

### Fixed

- Avoid stale pi extension context crashes after session replacement or reload by snapshotting shell, footer, and editor chrome state before render callbacks run.
- Normalize context usage against the active model context window so resumed sessions do not display an old context limit after model restoration or selection.
- Refresh Pi-mix shell chrome after resource discovery to pick up restored session state during startup and resume flows.
