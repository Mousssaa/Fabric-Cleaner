# Existing Features Matrix (Phase 0)

Source: Kudu `main` @ `942af64` (= `v3.11.0` + 6 commits). Static code inspection only. **Nothing in this table was executed at runtime**, so no feature is marked "verified at runtime".

## Legend

**Status**
- **IV** — Implemented and verified by code inspection (call path read end-to-end from UI → IPC → service/OS call).
- **INR** — Implemented, not verified at runtime (code exists; inspected partially).
- **PI** — Partially implemented (some platforms or sub-features stubbed/missing).
- **UI** — UI-only or placeholder.
- **EXT** — Depends on an external service (Kudu Cloud or third-party).
- **RFI** — Requires further investigation.
- **NF** — Not found.

**Platforms:** ✅ code path exists · ⚠️ partial / degraded · ❌ not supported (hidden or returns "unsupported") · Elev = may need admin/root.
**Net:** None · Opt (optional) · Req (required).
**Tests:** number of test files directly covering the module (`*.test.ts`), from `git ls-files`. Counts are static; pass/fail is NOT RUN.

Route = renderer route in `src/renderer/src/App.tsx:163-203`. IPC = `src/main/ipc/<name>.ipc.ts`.

## A. Cleaning and storage

| # | Feature | Route / entry | Main implementation | Win | mac | Linux | Net | Elev | Tests | Status | Key limitations / risks |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | System cleaner (temp, logs, crash dumps, caches) | `/cleaner` (`CleanerPage.tsx`) | `ipc/system-cleaner.ipc.ts`, `services/file-utils.ts` (`scanDirectory` 987, `cleanItems` 459, `safeDelete` 392), `rules/*/system.json`, `rules/loader.ts` | ✅ | ✅ | ✅ | None | Some targets `needsAdmin` | 1 + ~12 file-utils suites | IV | **Permanent delete** (`rm` recursive). Revalidates exclusions/recency/symlinks before delete. Optional secure overwrite (ineffective on SSD/CoW — Inference). |
| 2 | Browser cleaner (Chromium family, Firefox, Safari etc.) | `/cleaner` | `ipc/browser-cleaner.ipc.ts`, `platform/*/browser.ts`, `rules/*/browsers.json`, `services/chromium-cache.ts`, `services/cleaner-blockers.ts` | ✅ | ✅ | ✅ | None | No | 1 + chromium-cache, blockers | IV | Can close running browsers (`closeBrowsers`) and, on Windows, other blocking apps by main-owned PID allowlist (`cleaner-blockers.ts:348`). Data loss if user closes browser with unsaved state. |
| 3 | App cache cleaner (Discord, VS Code, npm, Adobe…) | `/cleaner` | `ipc/app-cleaner.ipc.ts`, `rules/*/apps.json` (175 win / 104 mac / 99 linux app IDs per `npm run parity-check`) | ✅ | ⚠️ fewer rules | ⚠️ fewer rules | None | No | 1 + rule suites | IV | Rule accuracy is per-app; rules are bundled, not downloaded. |
| 4 | Gaming cleaner (launchers, shader caches, redistributables) | `/cleaner` | `ipc/gaming-cleaner.ipc.ts`, `services/game-detector.ts`, `rules/*/gaming.json`, `steam.json`, `gpu-cache.json` | ✅ | ⚠️ | ⚠️ | None | No | game-detector | INR | Fewer rules on mac/Linux. |
| 5 | Native maintenance ops (uv/pnpm prune, DISM component cleanup, Delivery Optimization) | `/cleaner` (unselected by default) | `services/managed-cleanup.ts`, `docs/managed-cleanup.md` | ✅ (DISM/DO need admin) | ✅ uv/pnpm | ✅ uv/pnpm | None | Win: yes | 1 | IV | Disabled while exclusions exist; reports "savings vary". |
| 6 | Docker / journald cleanup | `/cleaner` | `services/docker-cache-cleanup.ts`, `services/journal-cleanup.ts` | ⚠️ Docker | ⚠️ Docker | ✅ | None | journald: root | 1 each | INR | Shells out to `docker`/`journalctl`. |
| 7 | Recycle Bin / Trash | `/cleaner` | `ipc/recycle-bin.ipc.ts`, `services/recycle-bin-*.ts`, `services/trash-info.ts` | ✅ | ✅ | ✅ | None | No | 5 | IV | Irreversible by nature. |
| 8 | Uninstall leftovers (standalone) | `/cleaner` | `services/uninstall-leftovers.ts` | ✅ | ❌ throws (`:192`) | ❌ | None | Some | 3 | PI | Windows-only ownership data. |
| 9 | Registry cleaner + backups + seals | `/registry` | `ipc/registry-cleaner.ipc.ts` (2,445 lines), `services/registry-backups.ts`, `registry-backup-seal.ts` (`HKLM\SOFTWARE\Kudu\RegistryBackupSeals`) | ✅ | ❌ hidden | ❌ hidden | None | Yes (HKLM) | 2 + 2 | IV | Registry cleaning has low measurable benefit; backups mitigate. |
| 10 | Context menu cleaner | `/context-menu` | `ipc/context-menu-cleaner.ipc.ts` | ✅ | ❌ | ❌ | None | HKCR/HKLM | 1 | INR | |
| 11 | Environment (PATH) cleaner | (cleaner/registry area) | `ipc/environment-cleaner.ipc.ts` | ✅ | ❌ | ❌ | None | System vars: yes | 0 | RFI | No tests; editing PATH can break tooling. |
| 12 | Network cleanup (DNS cache, Wi-Fi profiles, ARP) | `/network` | `ipc/network-cleanup.ipc.ts`, `platform/*/network.ts` | ✅ | ⚠️ | ⚠️ | None | Some | 1 | INR | Deleting Wi-Fi profiles is user-visible data loss. |
| 13 | Database optimizer (VACUUM browser/app SQLite) | (cleaner/disk area) | `ipc/database-optimizer.ipc.ts`, `services/database-optimizer.ts`, `workers/database-worker.ts`, `database-vacuum.ts` (better-sqlite3) | ✅ | ✅ | ✅ | None | No | 2 | INR | Writes to third-party DBs; must ensure apps are closed. |
| 14 | Custom cleaning folders | Settings → Custom folders | `ipc/custom-folders.ipc.ts`, `services/custom-folders.ts`, `custom-folder-filesystem.ts`, `CUSTOM-FOLDERS.md` | ✅ | ✅ | ✅ | None | No | 2 | IV | Uses **Trash** (`shell.trashItem`). |
| 15 | Duplicate finder (SHA-256) | `/duplicates` | `ipc/duplicate-finder.ipc.ts` | ✅ | ✅ | ✅ | None | No | 1 | IV | Uses Trash. |
| 16 | Large file finder | `/large-files` | `ipc/large-file-finder.ipc.ts` | ✅ | ✅ | ✅ | None | No | 1 | IV | Uses Trash. |
| 17 | Downloads review | `/downloads` | `ipc/downloads-review.ipc.ts`, `services/downloads-review.ts`, `downloads-claim.ts` | ✅ | ✅ | ✅ | None | No | 2 | IV | Uses Trash. |
| 18 | Empty folder cleaner | `/empty-folders` | `ipc/empty-folder-cleaner.ipc.ts` (root-level guard `:125`) | ✅ | ✅ | ✅ | None | No | 1 | IV | Uses Trash. |
| 19 | Broken shortcut cleaner | (cleaner area) | `ipc/shortcut-cleaner.ipc.ts`, `services/shortcut-target.ts` | ✅ `.lnk` | ✅ aliases | ❌ / RFI | None | No | 1 | PI | No Linux `.desktop` handling found. |
| 20 | File shredder | `/file-shredder` | `ipc/file-shredder.ipc.ts` (protected path lists `:15-97`, identity check) | ✅ | ✅ | ✅ | None | No | 1 | IV | 2-pass overwrite; **not reliable on SSD/APFS/Btrfs** (Inference) — must be disclosed. |
| 21 | Disk analyzer (drives, tree, file types) | `/disk` | `ipc/disk-analyzer.ipc.ts`, `services/storage-scan.ts`, `mount-points.ts` | ✅ | ✅ | ✅ | None | No | 1 + 2 | INR | |
| 22 | App Space (per-app storage) | `/app-space` | `ipc/app-space.ipc.ts`, `services/app-space*.ts` | ✅ | ✅ | ✅ | None | No | 3 | INR | |
| 23 | Storage history (snapshots & diff) | `/storage-history` | `ipc/storage-history.ipc.ts`, `services/storage-history*.ts`, `shared/storage-history.ts` | ✅ | ✅ | ✅ | None | No | 4 | INR | |
| 24 | Disk repair (SFC, DISM, CHKDSK) | `/disk-repair` | `ipc/disk-analyzer.ipc.ts` (`runSfc` 257, `runDism` 383, `runChkdsk` 497) | ✅ | ❌ page shows unsupported (`DiskRepairPage.tsx:133`) | ❌ | None | Yes | 1 | PI | No macOS First Aid / Linux fsck equivalent. |
| 25 | Disk maintenance / TRIM | `/disk-maintenance` | `ipc/disk-trim.ipc.ts` (`fstrim` on Linux) | ✅ | ⚠️ info only — never runs (`:752-760`) | ✅ | None | Yes | 1 + trim-history | INR | |

## B. System management

| # | Feature | Route | Implementation | Win | mac | Linux | Net | Elev | Tests | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 26 | Startup manager (+ boot trace on Win) | `/startup` | `ipc/startup-manager.ipc.ts` (Run keys, Task Scheduler), `platform/darwin/startup.ts` (LaunchAgents), `platform/linux/startup.ts` (autostart `.desktop`, systemd, cron); `ipc/startup-safety.ipc.ts` | ✅ | ✅ | ✅ | None | HKLM/system items | 1 (1,853 lines) | IV | `startup-safety` untested. Delete is supported (CLI `startup delete`). |
| 27 | Service manager + safety KB | `/services` | `ipc/service-manager.ipc.ts`, `platform/*/services.ts` (CIM / `launchctl` / `systemctl`), `shared/service-safety-kb.ts` | ✅ | ✅ | ✅ | None | Yes | 2 + KB | INR | Wrong service changes can break boot/network. Recovery adapter Windows-only (`services/recovery.ts:29`). |
| 28 | Program uninstaller + leftovers | `/uninstaller` | `services/program-uninstaller.ts`, `ipc/program-uninstaller.ipc.ts`, `shared/uninstall-policy.ts`, `constants/uninstall-safelist.ts` | ✅ | ⚠️ list only (empty `uninstallString`, `:129-150`) | ⚠️ list only | None | Often | 2 + policy | PI | Non-Windows uninstall execution not confirmed (Inference: no uninstall command is populated). |
| 29 | Debloater (Appx removal) | `/debloater` | `ipc/debloater.ipc.ts` | ✅ | ❌ | ❌ | None | Yes | 1 | INR | Irreversible for some packages. |
| 30 | Driver manager (old packages, Windows Update drivers) | `/drivers` | `ipc/driver-manager.ipc.ts` (`pnputil`) | ✅ | ❌ | ❌ | Windows Update | Yes | 1 | INR | Removing drivers can break hardware. |
| 31 | Software updater | `/updates` | `services/software-updater.ts`: winget/choco/scoop/npm (Win), Homebrew (mac), apt/dnf/pacman (Linux) | ✅ | ✅ brew only | ✅ apt/dnf/pacman (no flatpak/snap) | Req (package repos) | Often | 3 | INR | Executes package managers with elevation (`Start-Process -Verb RunAs`, `software-updater.ts:699`). |
| 32 | Windows Update check/install | Updates page / cloud cmd | via `software-updater.ts` / `cloud-agent.ts` | ✅ | ❌ | ❌ | Req | Yes | — | RFI | |
| 33 | Restore point | (before risky ops) | `services/restore-point.ts` | ✅ | ❌ | ❌ | None | Yes | 1 | INR | |
| 34 | Recovery (undo settings changes) | `/recovery` | `ipc/recovery.ipc.ts`, `services/recovery*.ts`, `shared/recovery.ts` | ✅ | ⚠️ | ⚠️ | None | Varies | 4 | INR | Covers services/registry/privacy changes — **not** permanently deleted files. |
| 35 | Cleanup receipts / History / deletion log | `/history` | `services/cleanup-receipts.ts`, `history-store.ts`, `deletion-log-store.ts` (opt-in `keepDeletionLog`) | ✅ | ✅ | ✅ | None | No | 3+ | IV | Records outcome honestly (deleted / failed / skipped with reason). |
| 36 | Schedules (multi-schedule, conditions, auto-apply) | `/schedules` | `services/scheduler.ts`, `shared/schedule-policy.ts`, `settings-store` | ✅ | ✅ | ✅ | None | — | 3 + policy | INR | Runs only while app/tray is running; `autoApply` is user opt-in per schedule (`shared/types.ts:804`). |

## C. Security and privacy

| # | Feature | Route | Implementation | Win | mac | Linux | Net | Elev | Tests | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 37 | Malware scanner (YARA-X + PE heuristics + Authenticode/publisher trust + quarantine) | `/malware` | `ipc/malware-scanner.ipc.ts` (2,687), `malware-pe-heuristics.ts`, `malware-publisher-trust.ts`, `services/yara-engine.ts`, `workers/yara-worker.ts`, `services/authenticode.ts`, `platform/*/malware*.ts` | ✅ | ✅ | ✅ (gnu only) | **Auto** (YARA rules polled from Kudu Cloud for all users every 6 h, `malware-scanner.ipc.ts:2683`) | Some paths | 4 | PI / EXT for YARA | Rules are not bundled (`yara-rules-store.ts:335`): offline fresh installs have no YARA rules (Inference). Heuristics can false-positive; delete requires binding to a recent detection (GHSA-67rx fix). |
| 38 | Privacy Shield (OS telemetry/privacy settings) | `/privacy` (`/hardening` redirects) | `ipc/privacy-shield.ipc.ts` (1,613), `platform/darwin/privacy.ts` (2,087), `platform/linux/privacy.ts` | ✅ | ✅ | ✅ | None | Often | 1 + 2 | INR | Changes system policy; recovery tracked. |
| 39 | Privacy traces (recent files, shell history…) | within privacy/cleaner | `services/privacy-traces*.ts` | ✅ | ✅ | ✅ | None | No | 4 | INR | |
| 40 | App privacy audit (camera/mic/location access records) | `/privacy` tab | `ipc/app-privacy.ipc.ts`, `services/app-privacy.ts`, `docs/app-privacy-audit.md` | ✅ | ❌ | ❌ | None | No | 2 | INR | |
| 41 | Firewall audit | `/firewall` | `ipc/firewall-audit.ipc.ts` | ✅ | ❌ hidden | ❌ hidden | None | Read | 2 | INR | |
| 42 | Threat Monitor (connections/DNS vs blacklist) | `/threat-monitor` (badge "pro") | `services/threat-monitor.ts`, `platform/*/security.ts`; **started only by cloud agent** (`cloud-agent.ts:1610`) | ✅ | ✅ | ✅ | **Req** | — | 1 | EXT | Local engine exists; blacklist and activation come from Kudu Cloud Pro. |
| 43 | CVE / vulnerability scanner | `/cve` (badge "pro") | `ipc/cve-scanner.ipc.ts` → `cloudAgent.getVulnerabilities` (`cloud-agent.ts:275`, `:4008`) | — | — | — | **Req** | — | 0 (cve-filter 1) | EXT | Installed-app inventory uploaded; matching server-side. |
| 44 | Breach monitor (email breaches) | `/breach-monitor` (badge "basic") | `ipc/breach-monitor.ipc.ts` → `cloudAgent.getBreachMonitor` | — | — | — | **Req** | — | 0 | EXT | Emails sent to Kudu Cloud. |
| 45 | Program safety / startup safety ratings | Uninstaller/Startup | `ipc/program-safety.ipc.ts:7` → `cloudAgent.getInstalledProgramSafetyRatings()`, `ipc/startup-safety.ipc.ts:7` → `cloudAgent.getStartupSafetyRatings()` | ✅ | ✅ | ✅ | **Req** | — | 0 | EXT | Ratings come from Kudu Cloud; no tests for the IPC wrappers. |

## D. Performance and diagnostics

| # | Feature | Route | Implementation | Win | mac | Linux | Net | Elev | Tests | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 46 | Performance monitor (CPU/mem/disk/process/temps) | `/performance` | `ipc/perf-monitor.ipc.ts`, `services/perf-*.ts`, systeminformation | ✅ | ✅ | ✅ | None | Temps may | 9 | INR | Temperature availability varies by hardware. |
| 47 | Performance diagnostics (recordings, upload) | `/performance-diagnostics` (badge "pro") | `services/performance-diagnostics.ts`, `diagnostics-recorder.ts`, `diagnostics-store.ts` (safeStorage-encrypted), `diagnostics-cloud.ts` | ✅ | ✅ | ✅ | Opt/Req for upload | No | 2 | PI/EXT | Local recording; analysis/upload is Cloud Pro. |
| 48 | Game Mode | `/game-mode` | `ipc/game-mode.ipc.ts` (1,194) | ✅ | ❌ | ❌ | None | Yes | 1 | PI | **`mem-clear-standby` is a no-op for system memory** (`:422-428` runs `[System.GC]::Collect()` in PowerShell). Defaults stop WSearch/SysMain and kill updaters (`settings-store.ts` `gameMode.enabledOptimizations`). Misleading-claim risk. |
| 49 | Dashboard health score | `/` | `DashboardPage.tsx:326-349`, `components/shared/HealthScore` | ✅ | ✅ | ✅ | None | — | 0 | IV (logic) | Score = tool usage (60 pts) + malware-scan recency (+40), minus disk-usage and threats. **Not a system-health measurement.** |
| 50 | GPU fallback / renderer diagnostics | automatic | `services/gpu-fallback.ts`, `renderer-diagnostics.ts` | ✅ | ✅ | ✅ | None | — | 2 | INR | |

## E. Interfaces, cloud, platform services

| # | Feature | Entry | Implementation | Win | mac | Linux | Net | Tests | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 51 | CLI (scan/clean/registry/startup/debloat/disk/network/malware/privacy/drivers/services/programs/updates…) | `kudu --cli` | `src/main/cli.ts`, `CLI.md`, `services/cli-output.ts` | ✅ | ✅ | ✅ | None | 4 | IV | `--clean` deletes without interactive confirmation (by design for scripting). |
| 52 | Prometheus metrics server | CLI subcommand | `cli.ts:2040-2072`, `services/metrics.ts` | ✅ | ✅ | ✅ | Listens on all interfaces | 1 | IV | Unauthenticated, binds `0.0.0.0`. |
| 53 | Headless daemon (cloud agent) | `kudu --daemon [--api-key]` | `src/main/daemon.ts`, `scripts/install.sh` (systemd `kudu-daemon`) | ✅ | ✅ | ✅ | **Req** | — | EXT | |
| 54 | Kudu Cloud link / remote commands / telemetry | `/cloud` | `services/cloud-agent.ts` (36 command types, `:1789`) | ✅ | ✅ | ✅ | **Req** | 3 | EXT | Third-party commercial service. |
| 55 | App auto-update | Settings | `services/auto-updater.ts` (electron-updater → GitHub Releases) | ✅ installer only | ✅ | ✅ AppImage only (`:43-46` skips deb) | Req | 1 | INR | Portable and deb builds update manually. Update check runs on every start even with auto-update off. |
| 56 | Run at startup / tray / minimize-to-tray | Settings | `index.ts:190-300` (`KuduStartup` scheduled task on Win), `index.ts:362-372` (`app.setLoginItemSettings` on mac **and Linux**), `tray-icon.ts` | ✅ | ✅ | ⚠️ autostart likely no-op (Electron API is mac/Win only — Inference); no tray when elevated | None | 2 | PI | Affects scheduled scans on Linux. |
| 57 | Elevated relaunch | Settings `preferElevatedLaunch` | `platform/*/elevation.ts` (pkexec on Linux, osascript on mac) | n/a (always admin) | ✅ | ✅ | None | — | INR | Elevated renderer runs **without sandbox** on mac/Linux. |
| 58 | Localization (31 languages) | Settings | `src/renderer/src/locales/*`, `shared/languages.ts` (`RTL_LANGUAGES`) | ✅ | ✅ | ✅ | None | 2 | IV | `fa` missing 8 keys; others complete vs `en` (3,251 keys). |
| 59 | Share cleanup result (social links, image card) | History/Completion | `renderer/src/lib/cleanup-share.ts` | ✅ | ✅ | ✅ | Opens browser | — | INR | Hard-codes `usekudu.com`. |
| 60 | Onboarding | first run | `settings-store.onboarding.test.ts`, renderer components | ✅ | ✅ | ✅ | None | 1 | RFI | Flow not traced in detail. |
| 61 | Portable mode | Windows portable build | `services/portable.ts`, `scripts/build-portable-zip.js` | ✅ | — | — | None | 2 | INR | |

## F. Requested items not found or only partly present

| Requested area | Finding |
|---|---|
| Similar-photo detection | **NF** (duplicates are exact SHA-256 only). |
| Vulnerability scanning without cloud | **NF** (CVE scanner is server-side). |
| Cleanup recovery for permanently deleted cleaner items | **NF** (receipts and deletion log only; no undo). Trash-based features recoverable via OS Trash. |
| Browser extension management | **NF** (searched `src/main` for extension handling; only shell context-menu extensions in `registry-cleaner.ipc.ts:583`). |
| Hardware health (SMART) | **PI** — disk health via systeminformation in perf/cloud telemetry (`perfGetDiskHealth`); no dedicated page. |
| Linux shortcut (`.desktop`) cleanup | **NF**. |
| flatpak/snap updates | **NF**. |

## Summary counts

- ~61 distinct features/capabilities identified (more than the README lists).
- Cloud-dependent: 7 (Threat Monitor, CVE, Breach Monitor, program/startup safety ratings, Diagnostics upload, Cloud page/remote commands, daemon).
- Windows-only: 13 (registry, context menu, environment, uninstall leftovers standalone, debloater, drivers, disk repair, restore point, Windows Update, game mode, firewall audit, app privacy audit, Windows native maintenance).
- Misleading or needs product review: Game Mode memory op, health score, file shredder on SSD.
