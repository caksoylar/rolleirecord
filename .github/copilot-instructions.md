# Copilot Instructions for Rolleirecord

## Overview

Rolleirecord is a vanilla JS single-page PWA for logging analog film photography metadata. It has **zero runtime dependencies** — no frameworks, no bundlers, no vendored libraries. All JS files are plain `<script>` tags loaded in order.

## Commands

- **Lint:** `npm run lint` (eslint, `site/src/` only)
- **Format:** `npm run format` (prettier)
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

Files in `site/src/` are plain scripts (`sourceType: "script"`), not ES modules. They share state through globals, loaded in dependency order via `index.html`:

`config.js` → `entities.js` → `entity-modal.js` → `rolls.js` → `data.js` → `table.js` → `selectors.js` → `exif.js` → `export.js` → `frame.js` → `options.js` → `app.js`

Each file can reference globals defined by earlier scripts. `app.js` is the entry point that calls `.init()` on all modules during `DOMContentLoaded`.

### Data model

- **Entities** (cameras, films): Managed by `EntityManager` class in `entities.js`, stored in localStorage. Schemas defined in `config.js` (`CAMERA_SCHEMA`, `FILM_SCHEMA`).
- **Rolls**: Managed by `RollManager` in `rolls.js` with a separate storage model (each roll contains `name`, `camera`, `film`, `frames[]`, `frameCount`, `notes`). `RollManagerAdapter` in `entities.js` wraps it for compatibility with `EntityFormModal`/`EntitySelector`.
- **Frames**: Stored as arrays inside each roll. Schema is `FRAME_SCHEMA` in `config.js` with field types: `select`, `number`, `text`, `checkbox`, `datetime`, `location`.

### Key patterns

- **Schema-driven UI**: `FRAME_SCHEMA`, `CAMERA_SCHEMA`, `FILM_SCHEMA`, `ROLL_SCHEMA` in `config.js` drive form rendering, validation, export, and type coercion. Add a field to the schema and the UI picks it up.
- **`safeInputId()`**: Replaces "name" → "label" in HTML `id`/`name` attributes to prevent iOS Safari autofill. Applied whenever generating input IDs from field names. Data model field names are unchanged.
- **Entity-specific fields**: `FRAME_SCHEMA` fields can have `entity_specific: "camera"` — these fields have per-camera option lists managed through `OptionsManager`.
- **`hidden-fields`**: Cameras store a `hidden-fields` array listing frame fields to hide for that camera (e.g., cameras without exposure compensation).
- **`RollManagerAdapter`**: Uses generic `Object.assign` pass-through in `create`/`update` — new roll schema fields flow through automatically without adapter changes.

### Service worker

`site/sw.js` caches all assets for offline use. The `ASSETS` list and `CACHE_NAME` version must be updated when adding/renaming files.

### CSS

`site/styles.css` uses CSS custom properties on `:root` for theming (light/dark via `prefers-color-scheme`). Form modals use a 2-column grid with `.form-group { display: contents }` — label and input become direct grid children.

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

- **No ES modules on main branch.** All `site/src/*.js` are plain scripts sharing globals. Use `// eslint-disable-next-line no-unused-vars` on global declarations that are consumed by other files.
- **Prefix unused variables with `_`** (e.g., `const { id: _id, ...rest } = obj`). Configured in eslint: `varsIgnorePattern: "^_"`.
- **Use `!=` / `== null` for null-or-undefined checks** with an `// eslint-disable-line eqeqeq` comment. The `eqeqeq` rule is set to warn.
- **Icons**: SVG sprites from Phosphor Icons in `site/icons.svg`, referenced as `<svg class="icon"><use href="icons.svg#icon-name"></use></svg>`.
- **Favor code reuse.** Extract shared logic into helper functions rather than duplicating patterns across files. When adding new functionality, look for existing utilities or patterns that can be extended. Refactor proactively when you see an opportunity to reduce duplication.
