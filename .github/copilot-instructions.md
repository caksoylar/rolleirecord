# Copilot Instructions for Rolleirecord

## Overview

Rolleirecord is a vanilla JS single-page PWA for logging analog film photography metadata. It has **zero runtime dependencies** — no frameworks, no bundlers, no vendored libraries. All JS files are plain `<script>` tags loaded in order.

## Commands

- **Lint:** `npm run lint` (eslint, `site/src/` only)
- **Format:** `npm run format` (prettier, formats `site/src/`, `site/styles.css`, `site/index.html`)
- **Format check:** `npm run format:check`
- No test suite exists. No build step on main branch.
- **Always run `npm run lint` and `npm run format` before committing.**

## Git Commits

Use **Conventional Commits** for commit titles:

- `fix: <description>` — bug fixes
- `feat: <description>` — new features
- `refactor: <description>` — code restructuring without behaviour change
- `style: <description>` — formatting, whitespace, CSS-only changes
- `chore: <description>` — build, config, dependency changes
- `docs: <description>` — documentation only

The body can be free-form. Keep the title under 72 characters.

## Architecture

### Script loading & globals

Files in `site/src/` are plain scripts (`sourceType: "script"`), not ES modules. They share state through globals, loaded in dependency order. There are two HTML entry points that share the same `src/` directory:

**`index.html` — main app:**

`config.js` → `entities.js` → `rolls.js` → `table.js` → `selectors.js` → `exif.js` → `export.js` → `frame.js` → `app.js`

**`entity-editor.html` — camera/film editor page:**

`config.js` → `entities.js` → `rolls.js` → `entity-editor.js`

Each file can reference globals defined by any earlier script. `app.js` is the main-app entry point that calls `.init()` on modules during `DOMContentLoaded`. See `dev/architecture.md` for the full dependency graph.

### Data model

- **Entities** (cameras, films): Managed by the `EntityManager` class in `entities.js` (instances `CameraManager`, `FilmManager`, registered in `EntityManagers`), stored in localStorage. Schemas defined in `config.js` (`CAMERA_SCHEMA`, `FILM_SCHEMA`).
- **Rolls**: Managed by `RollManager` in `rolls.js` with a separate storage model (each roll contains `name`, `camera`, `film`, `frames[]`, `frameCount`, `notes`). Roll create/edit uses its own `RollFormModal` defined in `selectors.js` (alongside `RollSelector`) — rolls do **not** go through `EntityManager`.
- **Frames**: Stored as arrays inside each roll. Schema is `FRAME_SCHEMA` in `config.js` with field types: `select`, `number`, `text`, `checkbox`, `datetime`, `location`. The `date` field is always auto-populated with the current datetime when a new frame is created — it is not optional/manual input.

### Key patterns

- **Schema-driven UI**: `FRAME_SCHEMA`, `CAMERA_SCHEMA`, `FILM_SCHEMA`, `ROLL_SCHEMA` in `config.js` drive form rendering, validation, export, and type coercion. Add a field to the schema and the UI picks it up.
- **`safeInputId()`** (in `config.js`): Replaces "name" → "label" in HTML `id`/`name` attributes to prevent iOS Safari autofill. Applied whenever generating input IDs from field names. Data model field names are unchanged.
- **Entity-specific fields**: `FRAME_SCHEMA` fields can have `entity_specific: "camera"` — these fields have per-camera option lists managed through `OptionsManager` (also defined in `entities.js`).
- **`hidden-fields`**: Cameras store a `hidden-fields` array listing frame fields to hide for that camera (e.g., cameras without exposure compensation).

### Service worker

`site/sw.js` caches all assets for offline use. The `ASSETS` list and `CACHE_NAME` version must be bumped when adding/renaming files (including both HTML entry points and any new `src/*.js` file).

### Modal & editor surfaces

There are two distinct add/edit surfaces — do not conflate them:

- **`frame.js`** (`FrameModal`) — modal for add/edit of individual frames in the main app. Invoked via `openAddModal()` / `openEditModal()`.
- **`entity-editor.html` + `src/entity-editor.js`** — a dedicated full-page editor for cameras and films (not a modal). Navigated to from the main app; uses `EntityManagers[type]` to dispatch on the selected entity type and edits properties / per-entity option lists via `OptionsManager`.
- **`selectors.js`** (`RollFormModal`) — modal for create/edit of rolls, used alongside `RollSelector`.

CSS is shared across these surfaces, but their JS is entirely separate. Changes to frame add/edit behavior never require touching the entity editor or roll modal, and vice versa.

**Copy-from-previous-frame** is already implemented: `openAddModal()` passes the last frame's id as `refData` to `FrameModal.open()`, which pre-fills form fields from that frame without entering edit mode. This is intentional — do not flag it as a missing feature during code review.

### CSS

`site/styles.css` uses CSS custom properties on `:root` for theming (light/dark via `prefers-color-scheme`). Form modals use a 2-column grid with `.form-group { display: contents }` — label and input become direct grid children.

**Height units**: Use `dvh` (dynamic viewport height), not `vh`. iOS Safari calculates `vh` based on the maximum viewport height (browser chrome hidden), causing overflow when the address bar is visible. `dvh` updates dynamically and is used throughout the app intentionally.

### Export/Import format

JSON export produces a roll-level object (not a flat frame array):

```json
{
  "name": "Roll Name",
  "frameCount": 36,
  "notes": "",
  "camera": { "name": "...", "format": "...", "size": "...", "hidden-fields": [] },
  "film": { "name": "...", "iso": 400 },
  "frames": [{ "id": 1, "shutter": "1/125s", ... }]
}
```

Import reconciles camera/film entities via `EntityManager.upsertByName()` — creates if missing, updates if properties differ.

## Conventions

- **No ES modules on main branch.** All `site/src/*.js` are plain scripts sharing globals. Use `// eslint-disable-next-line no-unused-vars` on global declarations that are consumed by other files. Always prefer `// eslint-disable-next-line` over `// eslint-disable-line` — Prettier may reflow trailing comments onto a new line, breaking the line-targeted directive.
- **Prefix unused variables with `_`** (e.g., `const { id: _id, ...rest } = obj`). Configured in eslint: `varsIgnorePattern: "^_"`.
- **Use `!=` / `== null` for null-or-undefined checks** with an `// eslint-disable-next-line eqeqeq` comment on the line above. The `eqeqeq` rule is set to warn.
- **Icons**: SVG sprites from Phosphor Icons in `site/icons.svg`, referenced as `<svg class="icon"><use href="icons.svg#icon-name"></use></svg>`.
- **Favor code reuse.** Extract shared logic into helper functions rather than duplicating patterns across files. When adding new functionality, look for existing utilities or patterns that can be extended. Refactor proactively when you see an opportunity to reduce duplication.
- **Ask before making major decisions.** If you are making any architectural overhauls, you ran into a roadblock and want to work around it with a hack, or if the code changes to satisfy a request seem too major, always check with the user first. Describe the problem, ask for clarification or confirm your decisions.
