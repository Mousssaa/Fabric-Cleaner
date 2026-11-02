# Platform Compatibility (Phase 0)

Source: Kudu `main` @ `942af64`. Static inspection of `electron-builder*.yml`, `src/main/platform/**`, IPC modules and CI workflows. **No OS was exercised at runtime in this audit** (cloud Linux container, dependencies not installed). Every "supported" below means "a code path exists", not "tested by us".

## 1. Build and release targets (from config)

| OS | Targets | Architectures | Installer type | Signing | Update channel | CI build | CI tests | Packaged smoke |
|---|---|---|---|---|---|---|---|---|
| Windows | `nsis`, `portable` (`electron-builder.yml`), ARM64 via `electron-builder.arm64.yml` | x64, arm64 | NSIS one-click, **per-machine**, `requireAdministrator`; portable EXE (admin) + portable ZIP (`scripts/build-portable-zip.js`) | Azure signing (release.yml:114-131) | `latest.yml` (x64), `latest-arm64.yml` (arm64) | `windows-latest`, `windows-11-arm` (release.yml:78-81) | `windows-latest` (ci.yml) | `windows-latest`, `windows-11-arm` |
| macOS | `dmg`, `zip` | x64, arm64 (separate artifacts `Kudu-${version}-${arch}`) | DMG | Developer ID + hardened runtime + notarization; entitlements `allow-jit`, `allow-unsigned-executable-memory` | `latest-mac.yml` (Inference: electron-builder default) | `macos-latest` builds both arches | `macos-latest` | **none** |
| Linux | `AppImage`, `deb` | x64, arm64 (native runners) | AppImage (stable name `Kudu-${arch}.AppImage`), deb with deps and `afterInstall: scripts/deb-postinstall.sh` (SUID `chrome-sandbox`) | none | AppImage only (`auto-updater.ts:43-46`) | `ubuntu-latest`, `ubuntu-24.04-arm` | `ubuntu-latest` | `ubuntu-24.04-arm` only |

Other distribution: Chocolatey package `choco/kudu.nuspec` (id `usekudu`), WinGet (release `distribute-release.yml`), shell installer `scripts/install.sh` (installs to `/opt/kudu`, symlink `/usr/local/bin/kudu`, optional `kudu-daemon` service).

Not present: rpm, Flatpak, Snap, Arch package, MSIX/Store, Mac App Store, universal macOS binary.

## 2. Native dependencies

| Module | Win x64 | Win arm64 | mac x64 | mac arm64 | Linux x64 | Linux arm64 | Notes |
|---|---|---|---|---|---|---|---|
| Electron 45 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | |
| better-sqlite3 13 | rebuilt by `electron-rebuild` | ✅ (docs/windows-arm64.md) | ✅ | ✅ | ✅ | ✅ | Used for VACUUM only |
| @litko/yara-x 0.11 | ✅ | ✅ | ✅ | ✅ | ✅ **glibc** | ✅ **glibc** | **No musl** (Alpine etc.) prebuilt in lockfile |
| systeminformation 5.33.16 | patched (`patches/…5.33.15.patch`, codepage handling) | | | | | | Pure JS, shells out to OS tools |

## 3. Feature availability per OS

Hard-coded feature flags (`src/main/ipc/index.ts:147-160`) mark these **Windows-only**: `registry`, `debloater`, `drivers`, `restorePoint`, `bootTrace`, `gameMode`, `firewallAudit`, `contextMenu`. The sidebar hides them elsewhere (`Sidebar.tsx:381-407`).

Additional Windows-only behaviour found outside the flags: Disk Repair (SFC/DISM/CHKDSK — `disk-analyzer.ipc.ts:257,383,497`; page shows unsupported, `DiskRepairPage.tsx:133`), standalone uninstall leftovers (`services/uninstall-leftovers.ts:192` throws), environment-variable cleaner, app privacy audit, Windows native maintenance (DISM component cleanup, Delivery Optimization), Windows Update, recovery adapters for services (`services/recovery.ts:29`), Authenticode publisher trust.

| Area | Windows | macOS | Linux |
|---|---|---|---|
| Cleaning rules (app IDs, `npm run parity-check`) | 175 | 104 | 99 |
| Total rule entries (all rule arrays) | 308 | 177 | 166 |
| Startup management | Registry Run keys + Task Scheduler + boot trace (`ipc/startup-manager.ipc.ts`) | LaunchAgents (`platform/darwin/startup.ts`) — Login Items / Background Items (`sfltool`, `SMAppService`) not found → RFI | XDG autostart `.desktop`, systemd user units, cron (`platform/linux/startup.ts`) |
| App autostart of Kudu itself | Scheduled task `KuduStartup` (`index.ts:190-300`, verified XML) | `app.setLoginItemSettings({ openAtLogin, args: ['--startup'] })` (`index.ts:362-372`) | Same `setLoginItemSettings` call — Electron documents this API for macOS and Windows only, so **"Run at startup" is likely a no-op on Linux** and schedules will not run after reboot unless the user starts the app (Inference from Electron API docs; verify at runtime) |
| Services | CIM/WMI, safety KB, recovery | `launchctl` (`platform/darwin/services.ts`) | `systemctl` (`platform/linux/services.ts`) |
| Uninstaller | Registry uninstall strings, quiet uninstall, leftovers | **List only** — `uninstallString` empty (`program-uninstaller.ts:129-150`) | **List only** |
| Software updates | winget, choco, scoop, npm | Homebrew | apt, dnf, pacman (no flatpak/snap/zypper) |
| Privacy | Privacy Shield (registry/policy), traces, app access audit | Privacy Shield (`platform/darwin/privacy.ts`, 2,087 lines, plist/launchd), traces | Privacy Shield (`platform/linux/privacy.ts`), traces |
| Malware | YARA + PE heuristics + Authenticode | YARA + platform paths (`platform/darwin/malware*.ts`) | YARA + platform paths |
| Threat monitor engine | `platform/win32/security.ts` | `platform/darwin/security.ts` | `platform/linux/security.ts` (1,092 lines) — engine is local but activated only by cloud |
| Disk tools | Analyzer, repair, TRIM, restore point | Analyzer; TRIM lists drives but never runs ("managed by macOS automatically", `disk-trim.ipc.ts:752-760`); no repair | Analyzer, `fstrim` |
| Recycle Bin | `$Recycle.Bin` per-user (`recycle-bin.ipc.ts:50,109`) | Trash | XDG Trash (`services/trash-info.ts`) |
| Elevation | Always admin (manifest) | osascript relaunch (`platform/darwin/elevation.ts`) with `--no-sandbox` as root | pkexec-style relaunch, `--no-sandbox`, `--kudu-data-dir` (`platform/linux/elevation.ts:39-52`); no tray when elevated (#383) |
| Performance monitor | systeminformation + Windows temperature provider (`perf-windows-temperatures.ts`) | systeminformation | systeminformation, POSIX process provider |

## 4. Platform-specific considerations

### Windows
- Registry & services: heavy use of `reg.exe` and PowerShell (`execFileAsync`). HKLM writes require admin; app always has it (see Security S-01).
- Registry backup seals under `HKLM\SOFTWARE\Kudu\RegistryBackupSeals` (`services/registry-backup-seal.ts:24`).
- ARM64: native builds and smoke tests exist; `docs/windows-arm64.md` states physical-device validation of system-changing operations is **still required**.
- Protected roots probe for `%WINDIR%`, `%PROGRAMDATA%`, Program Files before deletion (`file-utils.ts:518-541`).
- GPU fallback for broken drivers (`services/gpu-fallback.ts`, `platform/win32/gpu-restart.ts`); hardware acceleration disabled globally (`index.ts:53`).

### macOS
- Intel and Apple Silicon built separately; no universal binary.
- TCC/Full Disk Access: only one explicit mention (`large-file-finder.ipc.ts:210`: "TCC restrictions can silently block access"). No onboarding flow requesting Full Disk Access was found → many caches/traces may silently scan as empty. **RFI / Phase 1 requirement.**
- SIP-protected locations are not explicitly modelled (Inference); writes there fail with EPERM and are reported as failures.
- Hardened runtime with JIT + unsigned executable memory entitlements (needed for V8; review whether `allow-unsigned-executable-memory` is still required with Electron 45).
- Packaged smoke tests do **not** run on macOS in CI.

### Linux
- AppImage requires FUSE2 (`deb` depends on `libfuse2 | libfuse2t64` — oddly on the deb, Inference: for AppImage helpers).
- deb post-install sets SUID on `chrome-sandbox` (needed where unprivileged user namespaces are disabled).
- In-app updates only for AppImage; deb users rely on manual download (no apt repository).
- systemd & desktop integration: autostart via `.desktop`; services via `systemctl`; journald cleanup via `journalctl`.
- Running elevated disables the Chromium sandbox and the tray.
- musl distributions unsupported by YARA prebuilt.

## 5. Test coverage by platform

- Unit tests run on all three OS in CI (`ci.yml` matrix `windows-latest`, `macos-latest`, `ubuntu-latest`). Many platform tests mock `process.platform`; 34 test files under `src/main/platform/`.
- Packaged smoke: Windows x64, Windows arm64, Linux arm64 only (`package-smoke.yml:46-56`).
- CLI smoke (`scripts/cli-smoke-test.sh`) runs after build on all three CI OS.
- No GUI/E2E tests on any OS.
- Linux x64 and macOS (both arches) packaged artifacts are built in release but **not smoke-tested** before publication (Inference from workflow matrices).

## 6. Recommended common interfaces (for Phase 1)

The `PlatformImpl` abstraction in `src/main/platform/types.ts` already covers paths, browser, startup, services, privacy, security, malware, network, commands and elevation. Gaps to close:

1. Move Windows business logic out of IPC modules (`registry-cleaner.ipc.ts`, `startup-manager.ipc.ts`, `service-manager.ipc.ts`, `disk-analyzer.ipc.ts`, `malware-scanner.ipc.ts`) into `platform/win32/*` so IPC layers become thin and the `require()` back-references (`platform/win32/startup.ts`, `services.ts`) disappear.
2. Add `PlatformUninstaller` (Windows registry; macOS `.app` bundle + receipts/`pkgutil`; Linux package-manager removal) instead of list-only.
3. Add `PlatformDiskRepair` (Windows SFC/DISM/CHKDSK; macOS `diskutil verifyVolume`; Linux read-only `fsck -n` guidance only).
4. Add `PlatformPermissions` (macOS Full Disk Access check, Linux polkit availability, Windows elevation state) used by onboarding.
5. Replace the hard-coded `isWin` feature map with a capability report from each platform module.

## 7. Android

Out of scope. Nothing in the desktop code should be restructured for Android. Reusable at the product level only: rule taxonomy concepts, safety model, receipts/history UX.
