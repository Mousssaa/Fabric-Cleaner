# Baseline Test Report (Phase 0)

Date: 2026-11-01. Environment: cloud Linux container (x64), Node **v22.23.4**, npm **10.9.9**. Repository: fresh clone of `AdventDevInc/kudu` at `942af64` (`v3.11.0` + 6 commits). `node_modules/`, `out/`, `dist/` **do not exist**.

Phase 0 rules forbid installing dependencies or changing lockfiles. Therefore every check that needs `node_modules` (TypeScript, ESLint, Vitest, electron-vite, electron-builder, tsx, ajv) was **NOT RUN**. No result below is fabricated; "NOT RUN" means not executed.

Note: `.nvmrc` pins Node **24** and CI uses it; this container has Node 22, which satisfies `engines.node >=22` but does not match CI.

## 1. Commands discovered (from `package.json`, `CLAUDE.md`, `AGENTS.md`, CI)

| Purpose | Command | Source |
|---|---|---|
| Install | `npm ci` (CI) / `npm install`; `postinstall`: `patch-package --error-on-fail && install-electron && electron-rebuild -w better-sqlite3` | `package.json`, `ci.yml` |
| Dev | `npm run dev` (`electron-vite dev`); UI preview `npm run dev:ui` | `package.json` |
| Build | `npm run build` (`electron-vite build`) | `package.json` |
| Type-check | `npm run typecheck` (`tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.web.json`; test files excluded) | `package.json`, `CLAUDE.md` |
| Lint | `npm run lint` (`eslint .`) | `package.json` |
| Format check | `npm run format:check` (optional, not gating) | `package.json`, `AGENTS.md` |
| Rule validation | `npm run validate:rules` (`npx tsx src/main/rules/validate.ts`) | `package.json` |
| Unit tests | `npm test` (`vitest run`, node environment) | `package.json`, `vitest.config.ts` |
| Integration tests | No separate suite; integration-style tests are inside Vitest (e.g., `scripts/electron-download-proxy.test.ts`, IPC tests) | — |
| E2E / UI tests | **None exist** | — |
| CLI smoke | `bash scripts/cli-smoke-test.sh` (needs built app) | `ci.yml` |
| Packaged smoke | `node scripts/package-smoke-test.js <exe>`, `scripts/windows-package-smoke-test.js` | `package-smoke.yml` |
| All CI checks | `npm run check` (typecheck + lint + validate:rules + test) | `package.json` |
| Packaging | `npm run package`, `package:win`, `package:win:arm64`, `package:mac`, `package:linux`, `package:all` | `package.json` |
| Release | `npm run release -- patch\|minor\|major` (bumps, tags, pushes) | `CLAUDE.md` |
| Rule tooling | `npm run parity-check`, `catalog`, `new-rule`, `find-cache`, `preview-rule` | `package.json` |

## 2. Checks attempted

| # | Exact command | Executed | Exit code | Result | Relevant output / notes |
|---|---|---|---|---|---|
| 1 | `pwd; git branch -a; git status --short; git remote -v; git log -1` | Yes | 0 | Pass | Branch `main`, HEAD `942af64…`, clean tree, single `origin` remote |
| 2 | `git ls-remote --tags origin` | Yes | 0 | Pass | Tags `v1.5.1` … `v3.11.0` listed; `v3.11.0` → `7c51d0d` |
| 3 | `git fetch --depth=200 origin main && git fetch --depth=1 origin tag v3.11.0` | Yes | 0 | Pass | Read-only fetch into the audit clone (no branch/tag checkout) |
| 4 | `git merge-base --is-ancestor v3.11.0 HEAD; git rev-list --count v3.11.0..HEAD; git diff --stat v3.11.0 HEAD` | Yes | 0 | Pass | Ancestor; 6 commits; 220 files, +2,739/−440 |
| 5 | `npm run parity-check` (pure Node script, `fs` only, reviewed before running) | Yes | 0 | Pass (report) | 186 unique rules; 88 on all platforms; 16 partial; 82 single-platform. Per-platform: win32 175, darwin 104, linux 99 |
| 6 | `node -e '<parse every *.json under rules/ and src/renderer/src/locales/>'` | Yes | 0 | Pass | 1,049 JSON files parsed, 0 failures (syntax only — **not** schema validation) |
| 7 | `node -e '<compare locale keys of each language against en>'` | Yes | 0 | Pass (report) | `en` has 3,251 keys across 33 namespace files; all locales complete except `fa`: 8 missing (`cleaner.json`: 7 browser/app-close keys added in `942af64`; `cloud.json`: `planProFeature7`) |
| 8 | `rg` static searches (security patterns, URLs, secrets) | Yes | 0/1 | Informational | Results used in the audit documents; no hard-coded secrets found |
| 9 | `npm ci` / `npm install` | **NOT RUN** | — | — | Forbidden in Phase 0 (would install deps and run postinstall native rebuilds) |
| 10 | `npm run typecheck` | **NOT RUN** | — | — | Requires `typescript` in `node_modules` |
| 11 | `npm run lint` | **NOT RUN** | — | — | Requires `eslint` and plugins |
| 12 | `npm run validate:rules` | **NOT RUN** | — | — | `npx tsx` would download `tsx`; `ajv` not installed |
| 13 | `npm test` | **NOT RUN** | — | — | Requires `vitest`; some suites also need native `better-sqlite3`/`yara-x` |
| 14 | `npm run build` | **NOT RUN** | — | — | Requires `electron-vite` |
| 15 | `bash scripts/cli-smoke-test.sh` | **NOT RUN** | — | — | Needs built app + Electron binary |
| 16 | `npm run package*` | **NOT RUN** | — | — | Needs deps; signing; not appropriate in Phase 0 |
| 17 | `npm audit` | **NOT RUN** | — | — | Needs network + resolution; existing repo triage (`docs/security-alert-triage.md`, 2026-10-18) reports production audit clean — **not re-verified** |
| 18 | Any scan/clean/repair against the host | **NOT RUN** | — | — | Forbidden; would also be meaningless in a container |

## 3. Static test inventory (counts, not results)

| Location | Test files |
|---|---|
| `src/main/services` | 89 |
| `src/main/ipc` | 39 |
| `src/main/platform` | 34 |
| `src/renderer/src` | 28 (node environment; no DOM rendering) |
| `src/shared` | 11 |
| `src/main` (root: cli, build-config, app-icon, tray, startup-task) | 7 |
| `src/main/rules` | 3 |
| `scripts/` | 5 |
| **Total** | **216** (211 under `src/`, 5 under `scripts/`; ~3,336 `it(`/`test(` occurrences by `grep`, approximate) |

CI (`ci.yml`) runs lint/typecheck/validate on Ubuntu and `npm test` + build + CLI smoke on Windows, macOS and Ubuntu. Packaged smoke tests (`package-smoke.yml`) run on `windows-latest`, `windows-11-arm`, `ubuntu-24.04-arm` only. CI status of `942af64` on GitHub was **not checked** (GitHub API not attached to this session).

## 4. Untested areas (from inspection)

- No GUI/E2E tests at all; renderer behaviour is untested in a browser environment.
- IPC modules without direct tests: `breach-monitor`, `cve-scanner`, `environment-cleaner`, `gaming-cleaner`, `program-safety`, `startup-safety`.
- No Electron security regression tests (navigation, sender, permissions).
- No packaged smoke tests on macOS or Linux x64.
- Windows ARM64 system-changing operations not validated on physical hardware (`docs/windows-arm64.md`).
- Linux autostart behaviour (suspected no-op) untested.
- Offline malware scanning without cloud rules untested.

## 5. Recommended first verification run (Phase 1, in a disposable environment)

```
nvm use 24
npm ci
npm run check            # typecheck + lint + validate:rules + test
npm run build
bash scripts/cli-smoke-test.sh
```

Run on Windows, macOS and Linux VMs; record exit codes and failures in an updated version of this report.
