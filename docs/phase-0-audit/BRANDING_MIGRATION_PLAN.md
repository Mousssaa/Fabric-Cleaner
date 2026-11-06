# Branding Migration Plan (Phase 0)

Status: **inventory and plan only.** No name, logo, colour, font, identifier or asset was changed. The HakTrak Brand Kit has **not** been supplied; this document does not propose a final product name, logo, palette, typography, icon set or UI design.

Source: Kudu `main` @ `942af64`. Counts from `rg -i -c kudu` (excluding `package-lock.json` and `CHANGELOG.md`).

## 1. Scale

| Area | "kudu" occurrences (case-insensitive) |
|---|---|
| Renderer locale JSON (31 languages, 682 files) | ~3,663 |
| Renderer code (pages/components/stores, excluding locales) | ~645 |
| `src/main/services` | 246 |
| `src/main/platform` | 76 |
| `src/main/cli.ts` (+ tests) | 68 (+19) |
| `src/main/ipc` | 55 |
| `scripts/` | 91 |
| Root docs (README, CLI.md, CUSTOM-FOLDERS.md, CONTRIBUTING.md, SECURITY.md, CLAUDE.md) | ~59 |
| `docs/` (pre-existing) | 21 |
| Packaging (`electron-builder*.yml`, `package.json`, `choco/`) | ~31 |

## 2. Classification legend

- **RB** — Must be rebranded.
- **LA** — Must be retained for legal attribution.
- **INF** — Must be replaced with HakTrak infrastructure.
- **BK** — Must be reviewed after receiving the Brand Kit.
- **TC** — Must remain unchanged (or change only with a migration) for technical compatibility.
- **PD** — Requires a product decision.

## 3. Migration inventory

### 3.1 Identity and packaging

| Item | Current value | Location | Class | Notes |
|---|---|---|---|---|
| npm package name | `kudu` | `package.json:name` | RB | Internal; low risk. |
| Description, keywords, author | "A modern, open-source system cleaner…", `Kudu Contributors <kudu@users.noreply.github.com>` | `package.json` | RB | |
| homepage / repository / bugs | `https://usekudu.com`, `github.com/adventdevinc/kudu` | `package.json` | INF | |
| appId | `com.kudu.app` | `electron-builder.yml:1` | **TC + PD** | Changing appId changes Windows AppUserModelID, macOS bundle ID, userData folder, keychain/safeStorage items, notification identity. HakTrak is a new product → a new appId is expected; decide **before first HakTrak release** and never change afterwards. |
| productName | `Kudu` | `electron-builder.yml:2` | RB/BK | Drives exe name, install dir (`/opt/Kudu/`, `Program Files\Kudu`), userData path, window/menu names. |
| copyright | `Copyright © 2024-2026 Kudu Contributors` | `electron-builder.yml:3` | **LA + RB** | Keep Kudu/Advent notice in third-party/legal notices; HakTrak's own copyright for new work. |
| Artifact names | `Kudu-Setup-${version}`, `Kudu-Portable-…`, `Kudu-${version}-${arch}`, `Kudu-${arch}.AppImage` | `electron-builder.yml`, `.arm64.yml` | RB | AppImage name must stay stable within HakTrak (#401 comment). |
| NSIS shortcut name | `Kudu` | `electron-builder.yml` `nsis.shortcutName` | RB | |
| Publish target | GitHub `AdventDevInc/kudu` (inferred from `package.json` repository) | `electron-builder.yml` `publish` | **INF (critical)** | Must point to HakTrak releases before any HakTrak build is distributed. |
| ARM64 update channel | `latest-arm64` | `electron-builder.arm64.yml` | TC | Can be kept as a channel name. |
| deb install path | `/opt/Kudu/chrome-sandbox` | `scripts/deb-postinstall.sh` | RB (must follow productName) | Breaks sandbox SUID if not updated together. |
| Chocolatey package | id `usekudu`, title, authors "Advent Development, Inc.", projectUrl, iconUrl | `choco/kudu.nuspec`, `choco/tools/*.ps1` | INF/PD | New package id under HakTrak; or drop. |
| WinGet / website deploy / VirusTotal | release distribution | `.github/workflows/distribute-release.yml`, `release.yml:210-224` | INF/PD | Needs HakTrak accounts and secrets. |
| Linux installer script | `REPO="adventdevinc/kudu"`, `/opt/kudu`, `/usr/local/bin/kudu`, `kudu-daemon` | `scripts/install.sh` | INF/PD | Remove with daemon, or rebrand. |
| Code signing identities | Azure (Windows), Apple Developer ID | `release.yml:114-131` | INF | HakTrak certificates required. |
| Funding | `https://usekudu.com/sponsors` | `.github/FUNDING.yml`, `AboutPage.tsx:196` | PD | Remove or replace. |
| CODEOWNERS | `@dbfx`, `@adventdevinc/rules-maintainers` | `.github/CODEOWNERS` | RB | HakTrak maintainers. |

### 3.2 Visual assets (all **BK**)

| Asset | Path |
|---|---|
| Repo logo (README) | `logo.png` (1.1 MB) |
| App icons | `resources/icon.ico`, `resources/icon.icns`, `resources/icon.png`, `resources/icons/{16..512}x*.png` |
| Tray icons | `resources/icons/tray/{16..48}x*.png`, `master.png` (used by `src/main/tray-icon.ts`) |
| Demo animation | `resources/kudu-animated.gif` |
| Renderer logo / favicon | `src/renderer/src/assets/logo.png` (referenced by `src/renderer/index.html` and `AboutPage.tsx:31`) |
| Share card | SVG generated in `src/renderer/src/lib/cleanup-share.ts:139` with `usekudu.com` and accent colour |
| Theme colours | Hard-coded window colours `#101713`, `#edf3ef`, `#17372f` (`src/main/index.ts:485-492`, `:568-573`); CSS tokens in `src/renderer/src/globals.css`; product direction "Pulse" in `docs/pulse-product.md` |
| Fonts | System stack only: `'Segoe UI Variable Text', 'Segoe UI', system-ui, -apple-system` (`globals.css:19`) — no bundled font files |

No splash screen asset was found (window is shown on `ready-to-show`).

### 3.3 In-app text

| Item | Location | Class |
|---|---|---|
| Window/document title `Kudu` | `src/renderer/index.html` `<title>` | RB/BK |
| Tray tooltip & menu ("Open Kudu") | `src/main/index.ts:388`, `:424` via `t('openKudu')`, main-process i18n `src/main/i18n.ts` | RB |
| ~3,660 locale strings across 31 languages | `src/renderer/src/locales/**` | RB — use a scripted replacement **plus native review**; the repo has `scripts/translate.js` (uses an external translation service → review before use) |
| About page (logo, licence link, GitHub links, sponsor block) | `src/renderer/src/pages/AboutPage.tsx` | RB + **LA** (keep attribution) + INF |
| Help links `usekudu.com/help/startup-failed` | `SettingsPage.tsx:56`, `SchedulesPage.tsx:231` | INF |
| Cloud tier badges, billing links (7×) | `Sidebar.tsx:127-164`, Cloud/CVE/Threat/Breach/Diagnostics pages | PD (remove with cloud) |
| Notifications (scan complete, threats) | `services/scheduler.ts:401` and others | RB |
| CLI banner/help `Kudu CLI v…`, usage `kudu --cli …` | `src/main/cli.ts:655-720`, `CLI.md` | RB/PD (binary name) |
| Daemon messages | `src/main/daemon.ts` | Remove with daemon |
| Prometheus metric names `kudu_*` (11 metrics) | `src/main/services/metrics.ts` | TC/PD — changing breaks dashboards; new product → rename once. |

### 3.4 Technical identifiers (mostly **TC**)

| Identifier | Location | Why it matters |
|---|---|---|
| `window.kudu` preload global, `KuduAPI`, `KuduSettings` types | `src/preload/index.ts:909-911`, 66 renderer files | Internal API name; rename is mechanical but touches many files. Not user-visible. Optional. |
| `--kudu-data-dir=` flag | `src/main/index.ts:70-78`, `platform/linux/elevation.ts:50` | Elevated relaunch contract; rename consistently in one change. |
| `KuduStartup` scheduled task | `src/main/index.ts:190`, filter in `ipc/startup-manager.ipc.ts:359` | New product ⇒ new task name; startup-manager filter must match. |
| `HKLM\SOFTWARE\Kudu\RegistryBackupSeals` | `services/registry-backup-seal.ts:24` | Tamper seal store; new key for HakTrak. |
| userData folder (derived from productName), `Kudu-Dev` dev folder (12 refs) | `settings-store.ts:22`, `platform/darwin/privacy-state.ts:23`, others | HakTrak should start with its own data dir; no migration from Kudu unless product wants import. |
| File names: `kudu.log`, `kudu-cleanup-receipt.json`, `kudu-deleted-files.csv`, `kudu-recovery-history.json`, `kudu-storage-snapshot.json`, `kudu-diagnostic-*.json`, temp prefixes `kudu-reg-backup-`, `kudu-task-`, `kudu-blockers-`, `kudu-authenticode-`, `Kudu Downloads Recovery-`, `Kudu Custom Folder Recovery-` | services | Rename with product; some are user-visible (Trash folder names, exports). |
| `kudu-group:` markers | `platform/darwin/privacy.ts:521,540` | Internal parsing token; rename only together. |
| HTTP header `X-Kudu-Rules-Version` | `services/yara-rules-store.ts` | Removed with Kudu Cloud rule feed. |
| Electron app event `kudu:language-changed` | `src/main/index.ts:668` | Internal. |
| Vite plugin name `kudu-strip-csp-in-dev` | `electron.vite.config.ts:49` | Internal. |

### 3.5 Infrastructure URLs (**INF**)

`https://cloud.usekudu.com` (API, WebSocket discovery, diagnostics, YARA rules, billing), `https://usekudu.com` (homepage, help, sponsors, share links, systemd `Documentation=` in `cli.ts:1879`), `https://usekudu.com/cleaners`, GitHub `AdventDevInc/kudu` (releases, issues, updater, README badges, install script, `raw.githubusercontent.com` install URL). See `CLOUD_DEPENDENCIES_AUDIT.md`.

### 3.6 Documentation

`README.md`, `CLI.md`, `CONTRIBUTING.md`, `CUSTOM-FOLDERS.md`, `SECURITY.md` (security contact = Kudu GitHub advisories), `CODE_OF_CONDUCT.md`, `CLAUDE.md`, `AGENTS.md`, `rules/RULES.md`, `rules/CATALOG.md`, `rules/WINDOWS_APP_CACHE_SAFETY.md`, `docs/*.md`, `.github/ISSUE_TEMPLATE/*`, PR templates, `CHANGELOG.md` (historical — keep as upstream history or move to `UPSTREAM_CHANGELOG.md`). Class: RB, except `CHANGELOG.md` history and `LICENSE` (LA).

## 4. Legal attribution requirements

- `LICENSE`: MIT, "Copyright (c) 2026 Advent Development Inc". **Must be preserved** in source and shipped with binaries (MIT requires the notice "in all copies or substantial portions").
- `electron-builder.yml` copyright "Kudu Contributors" — preserve in a third-party notice.
- Recommended: `THIRD_PARTY_NOTICES` (generated from production dependency licences; the repo already runs `license-checker` in `license-check.yml`) and an About → Legal section: "Based on Kudu by Advent Development Inc., used under the MIT License."
- Do not imply endorsement by Advent/Kudu; remove Kudu trademarks/logos from the product UI.
- Check licences of any bundled data (YARA rule sets, threat feeds) separately.
- Cleaner rule JSON originates from Kudu contributors under MIT — covered by the same notice.

## 5. Execution plan (after the Brand Kit arrives — Phase 2/3)

1. **Decisions first (Phase 1):** final product name, appId/bundle ID, executable/CLI name, data directory name, whether to keep the CLI binary alias, Prometheus metric prefix, update/distribution channels.
2. **Infrastructure:** HakTrak GitHub org/repo or update server, code-signing certs (Windows, Apple), website/help URLs, security contact.
3. **Identifiers (one PR, tests updated):** `package.json`, `electron-builder*.yml`, `deb-postinstall.sh`, `KuduStartup`, registry seal key, `--kudu-data-dir`, file name constants, startup-manager self-filter. Run full test suite on all three OS + package smoke.
4. **Assets (from Brand Kit only):** regenerate `.ico/.icns/.png` sets and tray icons with correct sizes; update `index.html` favicon/title, About page; remove `kudu-animated.gif` and `logo.png` from shipped/visible locations.
5. **Copy:** scripted replacement in `en` locale + manual review; re-translate changed keys for 30 locales with native review (Arabic is a priority audience — verify RTL).
6. **Links:** replace all `usekudu.com` / `github.com/adventdevinc` links; delete billing/cloud links with the cloud removal.
7. **Docs:** rewrite README/SECURITY/CONTRIBUTING for HakTrak; keep `LICENSE`; add `NOTICE`/`THIRD_PARTY_NOTICES`; move upstream changelog.
8. **Verification:** `rg -i kudu` should return only attribution, upstream changelog and intentionally kept identifiers; packaged app inspection on each OS (exe metadata, Info.plist, `.desktop` file, installer/uninstaller strings, notifications).

## 6. What must not happen before the Brand Kit

- No placeholder logo or palette committed as final.
- No partial rename that leaves mixed "Kudu/HakTrak" identifiers in packaging (breaks updater/data paths).
- No release build that still points to Kudu's update feed or cloud.
