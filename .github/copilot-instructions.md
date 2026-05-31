# Copilot Instructions for Rolleirecord

## Overview

Rolleirecord is a vanilla JS PWA for logging analog film photography metadata. It has **zero runtime dependencies** — no frameworks, no bundlers, no vendored libraries. All JS files are plain `<script>` tags loaded in order. It has three HTML entry points (main app, entity editor, settings) sharing one `site/src/` directory.

## Commands

- **Lint:** `npm run lint` (eslint, `site/src/` only)
- **Format:** `npm run format` (prettier, formats `site/src/`, `site/styles.css`, `site/index.html`)
- **Format check:** `npm run format:check`
- No test suite exists. No build step on main branch.
- Linting and formatting are part of the pre-commit ritual — see [Shipping changes](#shipping-changes).

## Git Commits

Use **Conventional Commits** for commit titles:

- `fix: <description>` — bug fixes
- `feat: <description>` — new features
- `refactor: <description>` — code restructuring without behaviour change
- `style: <description>` — formatting, whitespace, CSS-only changes
- `chore: <description>` — build, config, dependency changes
- `docs: <description>` — documentation only

The body can be free-form. Keep the title under 72 characters.

## Shipping changes

Wrapping up a change for commit follows a fixed ritual: sync `site/sw.js` (asset manifest + `CACHE_NAME`), update `architecture.md` when structure changes, run `npm run lint` and `npm run format`, then create a Conventional Commit. This is automated by the **`ship-change` skill** (`.github/skills/ship-change/`) — prefer invoking it (e.g. "ship this change") over performing the steps by hand. The sections below remain the canonical reference for each individual rule.

## Architecture

Files in `site/src/` are plain scripts (`sourceType: "script"`), **not** ES modules — they share state through globals, loaded in dependency order across three HTML entry points (`index.html`, `entity-editor.html`, `settings.html`) that share the same `src/` directory.

> **`architecture.md` is the canonical structural reference** — load orders, the full dependency graph, per-module tables, the data model, and the export/import JSON shape. **For any structural or architectural question, read `architecture.md` first**, and update it when you add/move a file or change module wiring.

The rest of this section is working guidance (gotchas and conventions) that complements — but does not duplicate — `architecture.md`.

### Schema-driven UI

- `FRAME_SCHEMA`, `CAMERA_SCHEMA`, `FILM_SCHEMA`, `ROLL_SCHEMA` in `config.js` drive form rendering, validation, export, and type coercion. Add a field to the schema and the UI picks it up.
- **Entity-specific fields**: `FRAME_SCHEMA` fields can have `entity_specific: "camera"` — per-camera option lists managed through `OptionsManager` (in `entities.js`).
- **`hidden-fields`**: each camera stores a `hidden-fields` array of frame fields to hide for that camera.
- The frame `date` field is always auto-populated with the current datetime on frame creation — it is not manual input.
- Rolls do **not** go through `EntityManager`; they have their own `RollManager` + `RollFormModal`.

### Service worker

`site/sw.js` caches all assets for offline use. Bump the `ASSETS` list **and** `CACHE_NAME` whenever you add/rename a file (any of the three HTML entry points or any `src/*.js`). The `ship-change` skill handles this at commit time.

### Modal & editor surfaces — do not conflate

- **`frame.js`** (`FrameModal`) — modal for add/edit of individual frames in the main app (`openAddModal()` / `openEditModal()`).
- **`entity-editor.html` + `src/entity-editor.js`** — dedicated full-page editor for cameras/films (not a modal), navigated to from the settings page.
- **`selectors.js`** (`RollFormModal`) — modal for create/edit of rolls.

CSS is shared across these surfaces, but their JS is entirely separate. Changes to frame add/edit never require touching the entity editor or roll modal, and vice versa.

**Copy-from-previous-frame** is already implemented: `openAddModal()` passes the last frame's id as `refData` to `FrameModal.open()`, which pre-fills fields without entering edit mode. Intentional — do not flag it as missing during review.

### Pages & where data operations live

`index.html` is the interactive working surface; the header gear button **navigates** to `settings.html` (no modal). The split is deliberate: **the main page carries only roll operations that change what you're currently viewing; everything terminal/read-only or global lives on the settings page.** When adding a data operation, place it accordingly.

- **Roll import** is an _alternative creation flow_, not a standalone control: the `RollFormModal` create dialog always shows an **"Import from file…"** button (`Export.importRoll()`). It's the only roll-file op on the main page because it mutates the live view.
- **`settings.html`** hosts Export Roll (JSON), Export CSV (exiftool), entity-edit links, and developer/global ops (full backup, refresh assets, clear all) — all read-only/terminal or global.

### CSS

`site/styles.css` uses CSS custom properties on `:root` for theming (light/dark via `prefers-color-scheme`). Form modals use a 2-column grid with `.form-group { display: contents }`.

**Height units**: use `dvh`, not `vh`. iOS Safari computes `vh` from the maximum viewport height (chrome hidden), causing overflow when the address bar is visible; `dvh` updates dynamically and is used throughout intentionally.

## Conventions

- **No ES modules on main branch.** All `site/src/*.js` are plain scripts sharing globals. Use `// eslint-disable-next-line no-unused-vars` on global declarations that are consumed by other files. Always prefer `// eslint-disable-next-line` over `// eslint-disable-line` — Prettier may reflow trailing comments onto a new line, breaking the line-targeted directive.
- **Prefix unused variables with `_`** (e.g., `const { id: _id, ...rest } = obj`). Configured in eslint: `varsIgnorePattern: "^_"`.
- **Use `!=` / `== null` for null-or-undefined checks** with an `// eslint-disable-next-line eqeqeq` comment on the line above. The `eqeqeq` rule is set to warn.
- **Icons**: SVG sprites from Phosphor Icons in `site/icons.svg`, referenced as `<svg class="icon"><use href="icons.svg#icon-name"></use></svg>`.
- **Favor code reuse.** Extract shared logic into helper functions rather than duplicating patterns across files. When adding new functionality, look for existing utilities or patterns that can be extended. Refactor proactively when you see an opportunity to reduce duplication.
- **Ask before making major decisions.** If you are making any architectural overhauls, you ran into a roadblock and want to work around it with a hack, or if the code changes to satisfy a request seem too major, always check with the user first. Describe the problem, ask for clarification or confirm your decisions.
