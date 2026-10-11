# Submission path budget

Hard limit: **8,388,608 bytes (8 MiB)** for the complete Git submission bundle. These are explicit maximum byte allocations, including the existing 512-byte allocation before changing the ignore file. The revision uses that allocation to add root-only exceptions for `artifacts/`, its contents and `.imd-responses.json`, overriding local Git exclusions without editing `.git/`. Dependency/cache exclusions remain in place.

| Path | Maximum bytes | Purpose |
| --- | ---: | --- |
| `.gitignore` | 512 | Exclude dependencies/caches at every depth; include `dist/`, root `artifacts/**` and `.imd-responses.json` |
| `dist/**` | 262,144 | Complete production website, script/styles, cover, favicon and manifest |
| `src/**`, `public/**` | 262,144 | Complete game, original artwork and source assets |
| `tests/**`, `scripts/**` | 262,144 | Reproducible rule, browser and export verification |
| `artifacts/**` | 4,194,304 | Actual browser evidence and validation report |
| Root manifests, configuration and documentation; `docs/**` | 262,144 | Lockfile, build config, README, design system and attribution |
| Git bundle overhead and reserve | 3,145,216 | Remaining headroom |
| **Total** | **8,388,608** | |

Dependencies and browser downloads used for this assignment are in task-specific `/tmp/pond-dash-*` directories, outside the repository. No package archives, caches, registry mirrors, symlinks or submodules are delivered. The source `public/` and built `dist/` copies are both intentional. Screenshots are validation evidence and are not runtime assets.

The worker does not modify `.git/` or invoke a commit, as explicitly prohibited by this assignment. The contributor submission process packages the delivered files, including `dist/`. The final measured payload is recorded in `artifacts/submission-size.json`; it excludes the supplied `.imd/` inputs and scratch directory that are removed by the task infrastructure.
