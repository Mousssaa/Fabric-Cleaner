# Project Audit — Kudu → HakTrak (Phase 0)

> Phase 0 deliverable. Read-only investigation. No source, asset, dependency, identifier or Git-history changes were made.
> Audit date: 2026-11-01. Auditor: Claude Code (cloud session).
> Companion documents: `EXISTING_FEATURES_MATRIX.md`, `CLOUD_DEPENDENCIES_AUDIT.md`, `SECURITY_RISK_ASSESSMENT.md`, `PLATFORM_COMPATIBILITY.md`, `BRANDING_MIGRATION_PLAN.md`, `PRODUCT_OPPORTUNITIES.md`, `IMPLEMENTATION_ROADMAP.md`, `BASELINE_TEST_REPORT.md`.

Evidence conventions used in all nine documents:

- **Verified (code)** — read in source at the cited path/line.
- **Inference** — reasoned from code but not executed; labelled explicitly.
- **Unknown / needs runtime** — could not be confirmed in this environment.

---

## 1. Executive summary

Kudu is a large, actively maintained Electron + React + TypeScript desktop utility (~150k lines of TS/TSX excluding locale JSON; 216 test files, ~3,300 test cases by static count). It is **far more than a cleaner**: it contains ~40 tool pages covering file cleaning, registry, startup, services, malware (YARA-X), privacy hardening, software/driver updates, disk tools, performance monitoring, scheduling, recovery/receipts, a full CLI, a headless daemon, and an optional **Kudu Cloud** remote-management agent.

Engineering quality is generally high and security-conscious: context isolation is on, Node integration is off, the renderer is sandboxed (except when running as root on macOS/Linux), the preload exposes ~235 typed wrappers rather than a generic `invoke`, deletions are driven by **main-process scan IDs** rather than renderer-supplied paths, and there is extensive exclusion/symlink/recency revalidation before deletion. Several historical security advisories have been fixed with regression tests (`docs/security-alert-triage.md`).

The main issues for a HakTrak product are not code quality but **product fit and trust boundaries**:

1. **The Windows build always runs as Administrator** (`electron-builder.yml` → `win.requestedExecutionLevel: requireAdministrator`). Any renderer compromise is an admin compromise.
2. **A remote-command cloud agent is built in** (`src/main/services/cloud-agent.ts`, 4,040 lines) bound to `https://cloud.usekudu.com`, which is Advent Development Inc.'s commercial service. HakTrak cannot legitimately reuse it. Seven capabilities depend on it, several on paid tiers: Threat Monitor, CVE Scanner, Breach Monitor, program/startup safety ratings, Performance Diagnostics analysis, the Cloud page and the headless daemon. Separately, **every install polls `cloud.usekudu.com/api/yara-rules` every 6 hours without any opt-in** (`src/main/ipc/malware-scanner.ipc.ts:2682-2683`), because YARA rules are no longer bundled (`src/main/services/yara-rules-store.ts:335`).
3. **The main cleaner deletes permanently** (`fs.rm` in `safeDelete`), not to Trash. Only Duplicates, Large Files, Downloads Review, Empty Folders, Custom Folders and malware quarantine use Trash/quarantine. This conflicts with the Master Instructions' "prefer reversible" principle for non-cache data.
4. **Some features do not deliver what they name**: Game Mode's `mem-clear-standby` runs .NET GC inside a short-lived PowerShell process (no effect on system standby memory — `src/main/ipc/game-mode.ipc.ts:422-428`), and the Dashboard "health score" is mostly a tool-usage engagement metric (`src/renderer/src/pages/DashboardPage.tsx:326-349`).
5. **No Electron navigation guard or IPC sender validation** exists (no `will-navigate`, no `senderFrame` checks). Mitigated today by a strict CSP and no HTML sinks, but it is a defence-in-depth gap given (1).
6. **Windows-first depth**: registry, debloater, drivers, game mode, firewall audit, context menu, disk repair, restore points and standalone leftover scans are Windows-only. macOS/Linux have smaller rule sets (104/99 app rules vs 175 on Windows). On macOS/Linux the uninstaller only lists apps, and on Linux "Run at startup" uses `app.setLoginItemSettings`, which Electron documents for macOS/Windows only, so scheduled scans probably do not survive a reboot (Inference — `src/main/index.ts:362-372`).

Nothing was built, installed, or executed beyond read-only checks. `node_modules` is absent, so typecheck, lint, tests and build are **NOT RUN** (see `BASELINE_TEST_REPORT.md`).

## 2. Repository baseline

| Item | Value | Evidence |
|---|---|---|
| Audited checkout | Fresh shallow clone of `https://github.com/AdventDevInc/kudu` at `/home/claude/adventdevinc/kudu` (cloud container) | `git remote -v` |
| Branch | `main` (tracking `origin/main`) | `git branch -a` |
| HEAD | `942af64c976d97b23941cbd616106cc01ae7ed37` — "feat(cleaner): prompt to close browsers and blocking apps (#576)", 2026-11-01 01:07 -0400 | `git log -1` |
| `v3.11.0` tag | Exists remotely and fetched locally → `7c51d0d` "chore(release): 3.11.0", 2026-10-31 | `git ls-remote --tags`, `git log v3.11.0 -1` |
| Relation | `v3.11.0` is an ancestor of HEAD; HEAD is **6 commits ahead** | `git merge-base --is-ancestor`, `git rev-list --count` |
| Diff size | 220 files changed, +2,739 / −440 (mostly locales, cleaner rules, deps bumps, one cleaner feature) | `git diff --stat v3.11.0 HEAD` |
| `package.json` version | `3.11.0` (unchanged — the 6 commits are unreleased) | `package.json` |
| Working tree | Clean; no uncommitted changes existed before the audit | `git status --short` |
| Remotes | Only `origin` → `https://github.com/AdventDevInc/kudu` | `git remote -v` |

Commits after `v3.11.0`:

```
942af64 feat(cleaner): prompt to close browsers and blocking apps (#576)
58ad0d9 fix(i18n): localize settings theme selector and malware threat details (#575)
15d951c chore(deps-dev): bump fast-uri from 3.1.8 to 3.1.9 (#574)
6f3a659 feat(rules): add CapCut, DaVinci Resolve, Adobe logs, Camera Raw, and Figma Linux cleaner rules (#573)
01d1302 chore(deps): bump the npm-minor-patch group with 3 updates (#571)
a61c934 chore(deps-dev): bump conventional-changelog-angular from 8.3.1 to 9.4.0 in the npm-major group (#572)
```

**Implications.** The audited source is `v3.11.0 + 6 unreleased commits`. Findings apply to both, except the browser/app close prompt (`src/main/services/cleaner-blockers.ts`), the new rules, and dependency bumps. Note that `a61c934` bumped `conventional-changelog-angular` to `^9.4.0`, which contradicts the repo's own `CLAUDE.md` warning that it must stay on `^8` for changelog generation — a release-tooling regression to check upstream (Inference; not executed).

**Important limitation.** The user's own local checkout was not reachable (no connected device or folder). This audit was made on a fresh clone, so "existing user changes" could only be checked in that clone (none). If HakTrak work already exists on another machine or fork, it was not seen.

**Recommended remote arrangement (not applied).** For the HakTrak fork: create a HakTrak-owned GitHub repository, make it `origin`, and add Advent's repository as a read-only `upstream` (`git remote add upstream https://github.com/AdventDevInc/kudu.git` only if `upstream` does not already exist; check `git remote -v` first). Pin the fork point to tag `v3.11.0` (or a later reviewed tag), record it in a `UPSTREAM.md`, and pull upstream security fixes by cherry-pick after review rather than by merging `main` blindly.

## 3. Technology stack (from `package.json` + `package-lock.json` lockfileVersion 3)

| Component | Declared | Locked | Notes |
|---|---|---|---|
| Electron | `^45.0.0` | 45.0.0 | devDependency (correct for electron-builder) |
| React / React DOM | `^19.3.1` | 19.3.1 | |
| TypeScript | `^5.9.3` | 5.9.3 | |
| electron-vite | `^6.0.0` | 6.0.0 | build orchestrator (`electron.vite.config.ts`) |
| Vite | `^8.3.5` | 8.3.5 | |
| electron-builder | `^26.18.0` | 26.18.0 | packaging (`electron-builder.yml`, `electron-builder.arm64.yml`) |
| electron-updater | `^6.8.11` | 6.8.11 | GitHub Releases provider |
| Vitest | `^5.0.5` | 5.0.5 | `environment: 'node'`, no DOM tests |
| Tailwind CSS | `^4.3.3` | 4.3.3 | via `@tailwindcss/vite` |
| Zustand | `^5.0.16` | 5.0.16 | renderer state (30 store files) |
| react-router-dom | `^7.18.4` | 7.18.4 | `HashRouter` |
| i18next / react-i18next | `^26.5.11` / `^17.1.9` | | 31 languages incl. `ar` (RTL list exists in `src/shared/languages.ts`) |
| better-sqlite3 | `^13.0.3` | 13.0.3 | **native**; used only to VACUUM third-party SQLite DBs (`src/main/services/database-vacuum.ts`) — not app persistence |
| @litko/yara-x | `^0.11.0` | 0.11.0 | **native** prebuilt binaries for darwin x64/arm64, linux x64/arm64 **gnu only**, win32 x64/arm64 |
| systeminformation | `^5.33.16` | 5.33.16 | patched via `patches/systeminformation+5.33.15.patch` (filename version ≠ installed version — needs check at install time) |
| pusher-js | `^8.6.0` | 8.6.0 | WebSocket client for Kudu Cloud (Laravel Reverb) |
| recharts, framer-motion, lucide-react, sonner, @tanstack/react-table | | | UI |
| ESLint | `^10.13.0` | 10.13.0 | `eslint.config.mjs` |
| Node.js | `engines.node: ">=22"` | — | `.nvmrc` = `24` (CI uses `.nvmrc`) |
| Package manager | npm (lockfile v3) | — | `postinstall`: `patch-package --error-on-fail && install-electron && electron-rebuild -w better-sqlite3` |

## 4. Architecture overview

```
electron main (src/main/index.ts)
 ├─ mode dispatch: --cli → src/main/cli.ts | --daemon → src/main/daemon.ts | else initGui()   (index.ts:118-124)
 ├─ BrowserWindow (contextIsolation, no nodeIntegration, sandbox unless root)               (index.ts:465-499)
 ├─ IPC registration: src/main/ipc/index.ts → ~43 *.ipc.ts modules, 224 channels in src/shared/channels.ts
 ├─ services/ (business logic, ~90 modules): file-utils (scan/delete), settings-store, scheduler,
 │    cloud-agent, auto-updater, recovery, receipts, yara-engine, threat-monitor, software-updater …
 ├─ platform/ (OS abstraction): platform/index.ts + win32/ darwin/ linux/ {paths, browser, startup,
 │    services, privacy, security, malware, network, commands, elevation}
 ├─ rules/loader.ts — bundled JSON cleaner rules in rules/{win32,darwin,linux}/*.json (schema: rules/schema/rules.schema.json)
 └─ workers/ — database-worker.ts, yara-worker.ts
preload (src/preload/index.ts) — contextBridge.exposeInMainWorld('kudu', api) with ~235 typed ipcRenderer wrappers (line 911)
renderer (src/renderer/src) — React 19, HashRouter (App.tsx:158-220), 38 pages, Zustand stores, i18n with 31 locales
shared (src/shared) — types.ts, channels.ts, enums, pure policy modules (schedule-policy, recovery, uninstall-policy…) with tests
```

Key paths:

| Concern | Path |
|---|---|
| Main entry | `src/main/index.ts` (`package.json` `main: ./out/main/index.js`) |
| Preload | `src/preload/index.ts` |
| Renderer entry | `src/renderer/index.html`, `src/renderer/src/main.tsx`, `App.tsx` |
| Navigation | `src/renderer/src/components/layout/Sidebar.tsx` (platform filtering at 381-407, cloud tier badges at 127-164) |
| IPC hub | `src/main/ipc/index.ts`; channel names `src/shared/channels.ts` |
| Input validation | `src/main/services/ipc-validation.ts` |
| Deletion core | `src/main/services/file-utils.ts` (`safeDelete` 392, `cleanItems` 459) |
| Settings | `src/main/services/settings-store.ts` → `<userData>/config.json` (dev: `<userData>/Kudu-Dev`) |
| Persistence | JSON files in userData: `config.json`, `history.json`, `cloud-history.json`, `recovery/changes.json`, `storage-history/`, `threat-blacklist.json`, deletion log `deleted-files*.jsonl`, `quarantine/` |
| Scheduler | `src/main/services/scheduler.ts` + `src/shared/schedule-policy.ts` (in-process timers; OS autostart task `KuduStartup`) |
| Updates | `src/main/services/auto-updater.ts` (electron-updater, GitHub provider) |
| Cloud | `src/main/services/cloud-agent.ts`, `diagnostics-cloud.ts`, `yara-rules-store.ts`, `threat-blacklist-store.ts` |
| CLI / daemon | `src/main/cli.ts` (2,407 lines), `src/main/daemon.ts`, `CLI.md` |
| Packaging | `electron-builder.yml`, `electron-builder.arm64.yml`, `resources/`, `scripts/build-portable-zip.js`, `scripts/deb-postinstall.sh`, `choco/` |
| CI/CD | `.github/workflows/` (ci, package-smoke, release, distribute-release, license-check, translate, rules-bot, deploy-website, labeler, stale, pr-title, rebuild-macos) |

## 5. Main technical observations

1. **Strong deletion pipeline** — scan results live in a main-process cache; the renderer submits IDs only (`cleanItemsNow`, `file-utils.ts:465-475`). Before each delete: `lstat`, exclusion re-resolution via realpath (`:597`), Windows protected-root access probe (`:518-541`), recency revalidation (`:646`), symlink/hard-link handling (`:62-63`, `:322-328`), receipts and optional deletion log.
2. **Permanent deletion** by default for cleaner items (`rm(..., {recursive:true, force:true})`, `file-utils.ts:406`); optional 1-pass secure overwrite (`:394-399`).
3. **Layering inversion on Windows** — `platform/win32/startup.ts` and `services.ts` `require()` back into `ipc/*.ipc.ts` (comment at file top). Business logic for registry, services, startup, malware lives inside IPC modules (e.g. `registry-cleaner.ipc.ts` 2,445 lines, `malware-scanner.ipc.ts` 2,687 lines).
4. **Very large modules** — `cloud-agent.ts` (4,040), `cli.ts` (2,407), `software-updater.ts` (2,291), `darwin/privacy.ts` (2,087). Refactors must be careful and test-backed.
5. **Platform feature flags are hard-coded to `isWin`** (`ipc/index.ts:147-160`) and only cover 8 features; other Windows-only pages (Disk Repair) handle non-Windows inside the page.
6. **Cloud is opt-in** (no API key by default) and remote mutating commands are default-off (`settings-store.ts:80-91`), but read-only remote commands are always allowed once linked.
7. **No UI/E2E tests** — Vitest runs in `node` environment only; no Playwright/Spectron. Packaged-app smoke tests exist in CI (`package-smoke.yml`, `scripts/package-smoke-test.js`, `scripts/cli-smoke-test.sh`).

## 6. Existing strengths

- Mature, security-reviewed deletion and IPC validation with regression tests.
- Large test suite (~3,300 cases), CI on Windows/macOS/Linux, packaged smoke tests, license check gate (`license-check.yml` fails on GPL/AGPL/SSPL/EUPL).
- Data-driven cleaner rules with JSON Schema validation and a parity script.
- Recovery/receipt model for settings changes (services, registry tweaks) and registry backups with tamper seals (`registry-backup-seal.ts`).
- Cross-platform packaging already configured (NSIS, portable, DMG/ZIP notarized, AppImage, deb; x64 + arm64).
- Full CLI and Prometheus metrics output for power users.
- 31 locales with near-complete key parity (only `fa` missing 8 keys).

## 7. Main limitations

- Windows always-elevated execution model.
- Embedded third-party commercial cloud (Kudu Cloud) and paywalled features that HakTrak cannot reuse.
- Permanent deletion for the main cleaner; no app-level undo for those items.
- Feature breadth includes low-value or misleading items (Game Mode standby "clear", engagement-based health score).
- macOS/Linux parity gaps; no musl Linux support for YARA.
- No renderer/UI automated tests; no Electron security regression tests for navigation.
- Branding is deeply embedded (≈3,660 occurrences in locale strings alone, plus identifiers such as `com.kudu.app`, `KuduStartup`, `HKLM\SOFTWARE\Kudu`).

## 8. Key decisions required

See `IMPLEMENTATION_ROADMAP.md` §"Decisions". In short:

1. Cloud scope: remove the Kudu Cloud agent from HakTrak, or replace it with a HakTrak-owned backend later (recommended: remove from v1; keep local equivalents).
2. Windows privilege model: keep `requireAdministrator` or move to `asInvoker` + on-demand elevation (recommended: `asInvoker`).
3. Deletion policy: Trash-first for user-visible data, permanent only for regenerable caches with clear labelling (recommended).
4. Feature pruning: which of the ~40 tools ship in HakTrak v1 (recommend dropping/reworking Game Mode memory ops and the health score).
5. Baseline: fork from tag `v3.11.0` or from current `main` (`942af64`) (recommended: `v3.11.0`, then cherry-pick reviewed later commits).
6. Brand Kit timing — blocks Phase 2 and all user-visible renaming.
