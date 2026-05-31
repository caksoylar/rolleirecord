---
name: ship-change
description: >-
    Prepare and commit a change in the rolleirecord repo by running the project's release ritual:
    sync the service worker asset manifest + cache version, update architecture.md when structure
    changes, run lint and format, then create a Conventional Commit. Use when the user asks to
    "ship", "commit", "finalize", or "prepare" a change, or otherwise wants to wrap up work for commit.
---

# Ship a change

This skill packages the manual pre-commit ritual for **rolleirecord** so nothing is forgotten. Run
every applicable step in order. Skip a step only when it clearly does not apply, and say so.

## 1. Survey the change

Run `git status --short` and `git --no-pager diff --stat` (include staged + unstaged). Build a list of
files that were **added, renamed, or deleted** versus merely modified — the service-worker step below
depends on this distinction.

## 2. Sync the service worker (`site/sw.js`)

`site/sw.js` caches all assets for offline use, so its manifest must stay in lockstep with the files on
disk. Trigger this step whenever an asset is **added, renamed, or removed** — specifically any of the
three HTML entry points (`site/index.html`, `site/entity-editor.html`, `site/settings.html`) or any
`site/src/*.js` file (also icons, styles, manifest/favicon assets under `site/assets/`).

When triggered:

- Update the `ASSETS` array so it exactly matches the asset files present under `site/` (add new
  entries, remove deleted ones, fix renames). Keep the existing `./`-relative path style and grouping.
- Bump `CACHE_NAME` by incrementing its version suffix (e.g. `rolleirecord-v23` → `rolleirecord-v24`).
  Without a cache-name bump, existing clients never pick up the new/renamed assets.

If only existing files were edited in place (no add/rename/remove), the `ASSETS` list is already
correct — still bump `CACHE_NAME` so deployed clients receive the updated file contents.

## 3. Update `architecture.md` when structure changes

`architecture.md` is the canonical structural reference (load orders, dependency graph, per-module
tables, data model, export/import JSON shape). Update it whenever you **add/move/remove a file, change
module wiring, alter script load order, or change the data model / schema**. Pure behavioral tweaks
inside an existing module usually need no architecture change.

## 4. Lint and format

Run, from the repo root:

```bash
npm run lint
npm run format
```

Fix any lint errors before committing (prefer `npm run lint:fix` for autofixable ones). `npm run
format` rewrites files in place, so re-stage afterward. Do not introduce new tooling — there is no test
suite and no build step.

## 5. Commit

Stage the relevant files and create a commit whose **title is a Conventional Commit** under 72
characters:

- `feat:` new feature · `fix:` bug fix · `refactor:` behavior-preserving restructure ·
  `style:` formatting/CSS-only · `chore:` build/config/deps · `docs:` documentation only.

Write a short free-form body when the change benefits from explanation (the "why"). Unless the user says
otherwise, append this trailer:

```
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

## 6. Report

Summarize what shipped: the commit title/hash, whether `sw.js` (`ASSETS` and/or `CACHE_NAME`) and
`architecture.md` were touched, and the lint/format result. Call out any step you deliberately skipped
and why.
