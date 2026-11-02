# Security Risk Assessment (Phase 0)

Source: Kudu `main` @ `942af64`. **Static review only.** No exploit was attempted and no destructive test was run on any host. Absence of a finding below does **not** mean the application is secure.

Finding types: **CV** = confirmed vulnerability (exploitable as described), **DW** = design weakness (increases impact or likelihood; no concrete exploit shown), **RFI** = requires further investigation.

Severity: Critical / High / Medium / Low / Informational. "Blocks release" refers to a **HakTrak** release.

## 0. Summary table

| ID | Title | Type | Severity | Blocks HakTrak release? |
|---|---|---|---|---|
| S-01 | Windows build always runs as Administrator | DW | **High** | Yes (decision required) |
| S-02 | Built-in remote-command cloud agent bound to a third-party service | DW | **High** | Yes (must be removed or replaced) |
| S-03 | No navigation guard and no IPC sender validation | DW | Medium | Yes (cheap fix) |
| S-04 | Renderer sandbox disabled when running as root (macOS/Linux elevated relaunch) | DW | Medium | No, but must be documented / reduced |
| S-05 | Automatic, non-optional network fetch of YARA rules from `cloud.usekudu.com` | DW (privacy / supply chain) | Medium | Yes |
| S-06 | YARA rule bundle integrity is self-attested (hash in the same payload, no signature) | DW | Medium | Yes if a remote rule feed is kept |
| S-07 | Main cleaner deletes permanently; protected-path policy not centralised | DW (data loss) | Medium | Yes for user-data categories |
| S-08 | Cloud API key plaintext fallback; `--api-key` visible in process list | DW | Low | No (moot if cloud removed) |
| S-09 | Prometheus metrics server binds `0.0.0.0` without auth | DW | Low | No |
| S-10 | Misleading Game Mode memory optimisation and engagement-based "health score" | DW (honesty) | Low (security) / High (product) | Yes per Master Instructions |
| S-11 | PowerShell scripts built by string interpolation (escaped) | RFI | Medium until reviewed | No |
| S-12 | macOS entitlements allow JIT + unsigned executable memory | Info | Low | No |
| S-13 | Dev-only dependency advisories (braces via patch-package) | Info | Low | No |
| S-14 | `patches/systeminformation+5.33.15.patch` vs installed 5.33.16 | RFI | Low | No (build-time) |
| S-15 | Read-only remote commands always allowed once cloud is linked (event log, installed apps, network config) | DW (privacy) | Medium | Moot if cloud removed |
| S-16 | File shredder / secure-delete claims on SSD/CoW filesystems | DW (honesty) | Low | Needs UI disclosure |
| S-17 | No permission request handler for the session | DW | Low | No (cheap fix) |

## 1. Electron security

### Verified controls (positive findings)

| Control | Evidence |
|---|---|
| `contextIsolation: true` | `src/main/index.ts:467` |
| `nodeIntegration: false` | `src/main/index.ts:468` |
| `sandbox: !isRoot` | `src/main/index.ts:473` |
| Preload exposes typed functions only (no generic `invoke(channel)`) | `src/preload/index.ts` (~235 `ipcRenderer` calls with `IPC.*` constants), `exposeInMainWorld('kudu', api)` at `:911` |
| Strict CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'` | `src/renderer/index.html:6-9` |
| No `dangerouslySetInnerHTML` / `innerHTML` in renderer; no `eval` / `new Function` in `src/` | `rg` returned no matches |
| `window.open` denied; only `https:` URLs passed to `shell.openExternal` | `src/main/index.ts:542-552` |
| Production loads `file://…/renderer/index.html`; dev URL only via `ELECTRON_RENDERER_URL` | `src/main/index.ts:583-587` |
| Settings writes validated by allow-listed keys and typed values; prototype-pollution guard in deep merge | `services/ipc-validation.ts:13-…`, `services/settings-store.ts` `deepMerge` |
| Process execution overwhelmingly via `execFile`/`execFileAsync` (no `shell: true` found) | 256 `execFileAsync` sites; `rg "shell: true"` → 0 |
| Destructive IPCs take **IDs or main-owned candidates**, not arbitrary paths/PIDs | `file-utils.ts:465-475` (scan IDs), `cleaner-blockers.ts:348-375` (PID must be in `closeCandidates`, identity + start-time re-checked) |
| Single-instance lock in packaged builds | `src/main/index.ts:128` |

### S-03 — No navigation guard, no sender validation (DW, Medium)

- **Evidence:** no `will-navigate`, `will-redirect`, `web-contents-created`, `setPermissionRequestHandler` anywhere in `src/` (`rg` → 0). IPC handlers never inspect `event.senderFrame` / `event.sender.getURL()` (only `perf-monitor.ipc.ts:105` uses `event.sender`, to stream data).
- **Impact:** if any content ever reaches the renderer that can navigate the top frame (a future XSS, a dropped file/link causing navigation, a compromised dependency), the new page keeps the preload and therefore the full `window.kudu` API — which, on Windows, runs with admin rights (S-01).
- **Exploitability:** not demonstrated; today's strict CSP and lack of HTML sinks make it hard. Drag-and-drop navigation was not tested (no `dragover`/`drop` handlers in renderer).
- **Mitigation:** add `will-navigate`/`will-redirect` → `preventDefault()` unless URL equals the app's own `file://` index; add `web-contents-created` to deny `<webview>` and new windows; wrap `ipcMain.handle` in a helper that rejects senders whose frame URL is not the app origin; add a deny-all `setPermissionRequestHandler` (S-17). Add tests.
- **Blocks release:** yes (low cost, high value given S-01).

### S-01 — Always-elevated on Windows (DW, High)

- **Evidence:** `electron-builder.yml` `win.requestedExecutionLevel: requireAdministrator`; `nsis.perMachine: true`; `portable.requestExecutionLevel: admin`.
- **Impact:** the entire app, including Chromium renderer and all 224 IPC channels, runs with an elevated token for every session, even for read-only features. Any renderer/IPC bug becomes local privilege escalation-equivalent impact; mistakes in deletion logic hit system locations with full rights.
- **Mitigation:** move to `asInvoker`, keep a small elevated helper (or on-demand relaunch) for operations that genuinely need admin (HKLM edits, services, drivers, DISM, protected temp dirs). This is an architectural change — Phase 1 decision.
- **Blocks release:** yes, as a decision; it is not a bug in Kudu's own threat model.

### S-04 — Sandbox off when root (DW, Medium)

- **Evidence:** `index.ts:96-111` adds `--no-sandbox` when `getuid() === 0`; `sandbox: !isRoot` at `:473`. Linux elevation relaunches via a shell command with `--no-sandbox` (`platform/linux/elevation.ts:39-52`, quoting via `shellQuote`).
- **Impact:** elevated macOS/Linux sessions run an unsandboxed renderer as root.
- **Mitigation:** prefer a privileged helper process (polkit action / `SMAppService` daemon) over running the GUI as root.

## 2. IPC access control and input validation

- 224 channel constants in `src/shared/channels.ts`; ~43 IPC modules registered via `src/main/ipc/index.ts`.
- Validation is per handler (examples: `validateSettingsPartial`, PID array checks, service-name regex `services/recovery.ts:11`). Coverage was **sampled, not exhaustively verified**; `services/ipc-validation.test.ts` exists. → **RFI:** produce a per-channel table of (input type, validator, privilege) in Phase 5.
- No IPC authorisation layer exists beyond "the renderer is trusted". Combined with S-01/S-03 this is the key trust boundary.

## 3. Filesystem and cleanup safety

| Topic | Finding | Evidence |
|---|---|---|
| Target binding | Strong: renderer passes scan IDs; main resolves from its cache; missing IDs are reported as `scan-result-expired`, not silently dropped | `file-utils.ts:465-490` |
| Revalidation before delete | `lstat` per item; exclusions re-resolved with `realpath` per item; recency revalidation for deep-recency trees; Windows access probe for `%WINDIR%`, `%PROGRAMDATA%`, Program Files | `file-utils.ts:578-660`, `:518-541` |
| Symlinks | Never descended; `rm` unlinks the link only; scan roots that are symlinks are rejected | `file-utils.ts:200-220`, `:907-931`, `:999-1000` |
| Hard links | Files with `nlink > 1` are excluded from secure overwrite and failure-probe deletion | `file-utils.ts:62-63`, `:322-328` |
| Deletion primitive | `rm(path, { force: true, recursive: true, maxRetries: 3 })` → **permanent** | `file-utils.ts:406` |
| Partial failures | Best-effort descendant deletion with per-file failure reasons; receipts record deleted/failed/skipped with reasons | `file-utils.ts:420-436`, `services/cleanup-receipts.ts` |
| Protected paths | **Not centralised.** File shredder has its own lists (`ipc/file-shredder.ipc.ts:15-97`); empty-folder cleaner has a root-level guard (`:125`); cleaner relies on rule scoping + exclusions + Windows access probe | as cited |
| TOCTOU | Reduced by revalidation; an attacker able to swap a directory for a symlink between `lstat` and `rm` is mitigated because `rm` does not follow the final symlink, but intermediate-component races are not fully excluded (Inference) | — |
| Secure delete | Optional single overwrite before `rm`; errors ignored and normal deletion proceeds | `file-utils.ts:394-399` |
| Recovery | Trash for duplicates/large files/downloads/empty folders/custom folders/malware quarantine; **no recovery** for system/browser/app cleaner deletions | `rg trashItem` → 7 modules |

**S-07 (DW, Medium):** permanent deletion is acceptable for regenerable caches, but some categories (Downloads-adjacent rules, privacy traces, Wi-Fi profiles, registry values, uninstall leftovers) are user data or configuration. Mitigation: a central `DeletionPolicy` that classifies each rule/category as `cache` (permanent OK) / `user-data` (Trash or quarantine required) / `system` (backup + confirmation), plus a single protected-path module used by every destructive feature, with tests on fixture trees.

## 4. Cloud agent (S-02, S-15, S-08)

- **Evidence:** `services/cloud-agent.ts` connects to `cloud.usekudu.com` over HTTPS + Reverb WebSocket (`:655-760`) with `Authorization: Bearer <apiKey>` (`:681-685`, `:845`, `:884`…). It accepts 36 command types (`:1789-1826`), including `clean`, `malware-delete`, `registry-fix`, `driver-update-install`, `windows-update-install`, `run-sfc`, `run-dism`, `service-apply`, `startup-toggle`, `privacy-apply`, `shutdown`, `restart`.
- **Mitigations present:** mutating command families default **off** (`settings-store.ts:86-90`) and are checked per command (`cloud-agent.ts:1757-1787`); allow-list of command types; concurrency/spacing limits (GHSA-3wrv fix); cloud cannot run native maintenance or cache resets (`file-utils.ts:540-560`); blacklist URL fetch has private-IP and DNS-rebinding checks (`cloud-agent.ts:3800-3850`); `redirect: 'error'` on rule fetch.
- **Residual risk:** no per-command signature/nonce from the server was found; compromise of the API key or the server grants whatever toggles are on. Read-only commands always return event logs, installed apps and network config (S-15). With S-01, remote commands execute as admin on Windows.
- **HakTrak position:** the service is third-party and commercial; keep it out of HakTrak builds. If HakTrak ever builds fleet management, require signed commands, short-lived device credentials, per-command user approval for destructive actions, and default-off data sharing.
- **S-08 (Low):** `settings-store.ts:159-170` stores the key in plaintext if `safeStorage` is unavailable; `daemon.ts` accepts `--api-key <key>` on the command line.

## 5. Updates and downloaded content

| Item | Finding |
|---|---|
| App updates | electron-updater with GitHub provider (`electron-builder.yml` `publish`), `autoInstallOnAppQuit = true`. Windows signing via Azure (release workflow `:114-131`); macOS hardened runtime + notarization. electron-updater verifies Windows publisher signature when signed; **linux AppImage updates have no signature verification by default** (Inference from electron-updater behaviour; verify). |
| S-05 YARA rules | Polled for all users from `cloud.usekudu.com` every 6 h (`malware-scanner.ipc.ts:2683`, `yara-rules-store.ts:21`). |
| S-06 YARA integrity | `computedHash !== bundle.sha256` check (`yara-rules-store.ts:237`) where the expected hash is in the same response → protects against corruption, **not** against a malicious server/MITM-with-trusted-CA. Size and count limits exist (`:17-19`). YARA-X compiles rules (no code execution), so impact is detection tampering (false negatives / false positives leading to user-initiated deletion), not RCE. Mitigation: Ed25519-signed bundles with a pinned public key. |
| Threat blacklist | Validated shape and size caps (`threat-blacklist-store.ts:6-34`, `:98-104`). Same signing recommendation. |
| Cleaner rules | Bundled at build time; schema-validated (`src/main/rules/validate.ts`); no remote cleaner rules — **good**. Rules cannot carry commands (`docs/managed-cleanup.md`). |

## 6. Privileged commands and shell use

- 62 PowerShell `-Command` invocations. Interpolated values observed are pre-sanitised (`safeName`, `safeExe`, `safeArgs`, numeric PIDs, `'`→`''` escaping, regex-validated service names). Examples: `platform/win32/commands.ts:70`, `services/software-updater.ts:699`, `:987`, `services/perf-monitor.ts:130`, `services/cleaner-blockers.ts:360-369`.
- **S-11 (RFI, Medium until reviewed):** every interpolation site should be audited for its sanitiser, or migrated to passing data via `-EncodedCommand` with JSON parameters / environment variables. Not completed in Phase 0.
- Software updater launches package managers elevated (`Start-Process … -Verb RunAs`, `software-updater.ts:699`). Package names come from the managers' own output; verify that a malicious package name cannot break quoting (RFI).

## 7. Secrets, logs, local data

- No hard-coded API keys/secrets found in `src/` (searched for key/token patterns around cloud code; only runtime `apiKey` from settings). CI secrets are GitHub Actions secrets (release workflow), not in repo.
- Local data is JSON in `userData` (settings, history, receipts, deletion log, storage snapshots, quarantine manifest). Deletion log (opt-in) stores full file paths — sensitive but user-controlled. Diagnostics store is `safeStorage`-encrypted and refuses Linux `basic_text` backend (`ipc/performance-diagnostics.ipc.ts:16-24`).
- Logs: `kudu.log` / `kudu.old.log` (`services/logger.ts`). Content not audited for path/PII volume → RFI.

## 8. Malware detection false positives

- PE heuristics (entropy, packed sections — `ipc/malware-pe-heuristics.ts:62-73`) and publisher trust (`malware-publisher-trust.ts`) are heuristic. Deletion requires a recent matching detection (GHSA-67rx). HakTrak UI must distinguish *detected (signature)* / *suspicious (heuristic)* / *unknown* and default to quarantine, never auto-delete.

## 9. Privacy and honesty

- **S-10:** Game Mode `mem-clear-standby` runs `[System.GC]::Collect()` inside a new PowerShell process (`ipc/game-mode.ipc.ts:422-428`); this frees only that short-lived process's managed heap, so it **cannot clear the system standby list** (Inference based on .NET semantics; high confidence). Defaults also stop Windows Search/SysMain and kill updater processes. The dashboard health score (`DashboardPage.tsx:326-349`) awards 60/100 for having used tools recently. Both conflict with the Master Instructions ("no fake performance scores", no RAM-booster claims).
- **S-16:** shredding/secure overwrite cannot guarantee erasure on SSDs (wear levelling, TRIM), APFS/Btrfs (copy-on-write), or with snapshots/backups. Requires explicit UI disclosure.
- `SECURITY.md` claims "no network requests … except update checks and optional cloud" — contradicted by S-05.

## 10. Dependencies and supply chain

- Lockfile v3 committed; CI uses `npm ci` (lint job with `--ignore-scripts`; build/test jobs run install scripts — needed for native rebuild).
- `postinstall` runs `patch-package`, `install-electron`, `electron-rebuild -w better-sqlite3` — install-time code execution from dependencies is inherent to native modules.
- Native modules: `better-sqlite3` (rebuilt), `@litko/yara-x` (prebuilt platform packages — trust in the publisher's binaries; consider verifying provenance).
- Existing triage (`docs/security-alert-triage.md`, 2026-10-18): production audit clean; dev-only `braces` advisory via `patch-package` (S-13); `sprintf-js` removed via `overrides`. **Not re-verified** here (no `node_modules`, `npm audit` not run).
- `license-check.yml` fails on GPL/AGPL/SSPL/EUPL production licences — keep this gate.
- GitHub Actions are pinned to commit SHAs (e.g., `actions/checkout@3d3c42e…`) — good practice.

## 11. Items requiring further investigation (consolidated)

1. Per-channel IPC validation inventory (S-03/§2).
2. All PowerShell interpolation sites (S-11).
3. Linux AppImage update signature behaviour.
4. Logger content/PII.
5. Drag-and-drop navigation behaviour at runtime.
6. Offline malware scanner behaviour without cloud rules.
7. `systeminformation` patch applicability (S-14) and `npm audit` on a clean install in a disposable environment.

## 12. Statement

This assessment found a security-conscious codebase with several well-implemented controls. It does not certify the application as secure. The most important risks for HakTrak are architectural (always-admin on Windows, embedded third-party remote management, missing navigation/sender guards) rather than individual bugs.
