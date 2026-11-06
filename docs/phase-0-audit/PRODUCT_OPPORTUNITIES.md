# Product Opportunities (Phase 0)

Ideas to **evaluate**, not to implement now. Each is grounded in what the Kudu code already has (see `EXISTING_FEATURES_MATRIX.md`). Complexity: Low / Medium / High. Priority: P0 (needed for a trustworthy v1) → P3 (later / optional).

Guiding rule from the Master Instructions: useful, safe, measurable, maintainable; no misleading promises; no "RAM booster".

## 0. Highest-value moves are subtractive or corrective

Before adding features, the biggest product gains come from fixing trust issues found in the audit:

| # | Opportunity | User value | Existing? | Feasibility | Permissions | Local/cloud | Platform limits | Risks | Complexity | Priority |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.1 | **Trash-first cleanup with a HakTrak recovery window** for non-cache categories, and an explicit "permanent" label for caches | Undo mistakes; honest confirmation | Partial — Trash in 6 tools, receipts everywhere, permanent `rm` in main cleaner (`file-utils.ts:406`) | High — `shell.trashItem` already used; needs a central `DeletionPolicy` | User | Local | Trash unavailable on some Linux setups / network drives → fall back with warning | Trash can fill disk; must report space not yet reclaimed | Medium | **P0** |
| 0.2 | **Replace health score with measurable facts** (free space, last scan, pending updates, detected threats) | Honest overview | Score exists, engagement-based (`DashboardPage.tsx:326-349`) | High | None | Local | — | Users may expect a single number; design must explain | Low | **P0** |
| 0.3 | **Remove/rework Game Mode memory clearing**; keep only measurable actions (power plan, Focus Assist, pausing named services with restore) and show before/after metrics | Avoids false claims | Present, `mem-clear-standby` ineffective (`game-mode.ipc.ts:422-428`) | High | Admin for services | Local | Windows-only | Stopping services can affect updates/indexing | Low | **P0** |
| 0.4 | **First-run permissions onboarding** (macOS Full Disk Access check, Linux polkit availability, Windows elevation explanation) | Scans actually find data; fewer silent empties | Not found (only a TCC comment, `large-file-finder.ipc.ts:210`) | Medium | Varies | Local | macOS cannot grant FDA programmatically; only deep-link to System Settings | — | Medium | **P0** |
| 0.5 | **Offline-first malware rules** (signed bundled YARA set + opt-in HakTrak updates) | Malware scan works offline and on first run | Rules currently cloud-only (`yara-rules-store.ts:335`) | Medium — engine exists | User; admin for system dirs | Local + optional feed | YARA-X lacks musl builds | Rule licences; false positives | Medium | **P0** |

## 1. Candidate additions

| # | Opportunity | User value | Existing similar? | Technical feasibility | Required permissions | Local / cloud | Platform limitations | Security risks | Complexity | Priority |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Cleanup history & recovery center** (unified view of receipts, Trash-held items, settings recoveries, registry backups; one-click restore where possible) | Confidence; reversibility | Strong base: receipts, `/history`, `/recovery`, registry backups, deletion log | High | User; admin for registry/service restores | Local | Restore of permanently deleted cache is impossible (by design) | History files contain paths → encrypt or let user clear | Medium | **P0/P1** |
| 2 | **Advanced disk visualization** (sunburst/treemap with drill-down, filters by type/age, link to safe actions) | Understand where space goes | Disk analyzer, App Space, storage history exist | High (Recharts present; may need d3-hierarchy or custom canvas) | User; FDA on macOS | Local | Very large trees need worker + sampling | DoS by huge trees → existing limits in `storage-scan.ts:28` | Medium | **P1** |
| 3 | **Startup impact analysis** (measured boot/logon delay per item, not guessed) | Real performance gains | Windows boot trace exists (`bootTrace` flag, `startup-manager.ipc.ts:1003`) | Windows: High (event log 100/101–110 Diagnostics-Performance). macOS/Linux: Medium (`systemd-analyze blame` on Linux; macOS limited) | Admin for event log on some systems | Local | macOS has no equivalent official data | Wrong attribution if data missing → show "unknown" | Medium | **P1** |
| 4 | **Application update awareness** (unified list of outdated apps with source & changelog link; user-triggered updates) | Security hygiene | Software updater with 8 managers | High | Admin per manager | Local orchestration; managers' own network | Apps not managed by a package manager are not detectable reliably | Elevated package installs (existing pattern needs review, S-11) | Low–Medium | **P1** |
| 5 | **Local security health checks** (firewall on, disk encryption on (BitLocker/FileVault/LUKS), OS updates pending, Secure Boot, screen lock, SIP/Gatekeeper status, admin accounts) with "how to fix" links — read-only | Actionable posture without overclaiming | Firewall audit (Win), Privacy Shield, platform `security.ts` modules | High — mostly read-only OS queries | User for most; admin for some (BitLocker status) | Local | Each check per OS; some unavailable → "not checked" | Must not change settings silently; present as checklist not "score" | Medium | **P1** |
| 6 | **Local vulnerability assessment** (installed apps vs. OSV/NVD with "possible match" wording) | Know vulnerable software | CVE scanner is cloud-only | Medium–Low: CPE mapping of free-text app names is noisy; OSV good for package-manager packages; NVD API rate limits (or offline mirrored dataset → large) | User | Local matching + periodic data download (HakTrak-signed) | Accuracy best where package managers exist (brew, apt, winget IDs) | False positives/negatives; data freshness; feed licensing | High | **P2** |
| 7 | **Browser extension inventory** (list extensions per profile with permissions, source, enabled state; link to browser to remove) | Privacy/security visibility | Not found | High for Chromium (`Extensions/*/manifest.json`, `Preferences`) and Firefox (`extensions.json`) | User | Local | Safari extensions are app-based on macOS | **Do not modify browser profiles directly** (corrupts sync, policy); read-only + deep links | Medium | **P1** |
| 8 | **Privacy exposure checks** (camera/mic/location access history, apps with Full Disk/Accessibility access on macOS, clipboard/location history settings) — read-only + guided fixes | Visibility | Windows app access audit exists (`app-privacy`), Privacy Shield | Medium (macOS TCC.db is SIP-protected; read requires FDA and is undocumented) | FDA (macOS) | Local | macOS TCC format undocumented → fragile | Reading TCC DB is sensitive; keep local | Medium | **P2** |
| 9 | **Hardware health** (SMART attributes, battery health/cycle count, temperatures with clear "unavailable" states) | Early failure warning | `perfGetDiskHealth` (SMART via systeminformation), temperatures | Medium; SMART often needs admin/smartctl | Admin for SMART on some OS | Local | Varies by hardware/driver | Over-interpreting SMART → show raw + vendor thresholds only | Medium | **P2** |
| 10 | **Scheduled maintenance 2.0** (preview-based schedules, "scan & notify" default, auto-apply only for cache categories, run-on-missed) | Hands-off hygiene | Multi-schedule with conditions and `autoApply` exists | High | User | Local | Linux autostart gap (see Platform doc) | Auto-delete risk → restrict auto-apply to `cache` class | Low–Medium | **P1** |
| 11 | **Similar photo detection** (perceptual hash, review grid, Trash) | Big space wins for photo libraries | Exact duplicates only (SHA-256) | Medium — pHash/dHash in JS/WASM or native (e.g., sharp → new native dep) | User; Photos library access on macOS | Local | macOS Photos library is a package — **must not** touch it directly; only loose files | Accidental deletion of distinct photos → never auto-select; Trash only | Medium–High | **P2** |
| 12 | **Detailed system diagnostics report** (local, exportable, redacted: OS, hardware, drivers, recent crashes, disk, startup) | Support & troubleshooting | Perf diagnostics recorder (local) + cloud analysis | High (local summary) | User | Local, export file | — | Redaction of usernames/paths needed | Medium | **P2** |
| 13 | **Real-time suspicious-file monitoring** (watch Downloads/Startup folders, scan new executables with YARA/heuristics, notify — no auto-delete) | Earlier warning | Threat Monitor (network) engine; malware scanner | Medium; FS watchers + CPU budget | User | Local | Recursive watch limits on Linux (inotify); macOS FSEvents fine | Performance; false positives; must not claim AV-grade protection | High | **P3** |
| 14 | **Cleaner rule transparency** (show the exact rule, path, size, age and why it is safe for each item; link to rule source) | Trust | Rules have `subcategory` + docs (`rules/WINDOWS_APP_CACHE_SAFETY.md`) | High | None | Local | — | — | Low | **P1** |
| 15 | **Linux packaging breadth** (rpm, Flatpak) and **deb update path** (apt repo) | Reach & updates | AppImage/deb only; deb has no in-app updates | Medium | — | Infra | Flatpak sandbox conflicts with system-cleaner access → probably unsuitable | Repo signing keys | Medium | **P2** |

## 2. Not recommended

| Idea | Reason |
|---|---|
| RAM booster / "free memory" button | No measurable benefit; Kudu's current implementation is already ineffective (`game-mode.ipc.ts:422-428`). |
| Registry "cleaning" as a headline feature | Low measurable benefit and non-trivial risk; keep as advanced, backed-up tool or drop. |
| Driver "updater" from third-party sources | Supply-chain risk; only Windows Update sources (as today) if kept. |
| Automatic malware deletion | Contradicts safety principles; quarantine + user decision only. |
| Re-enabling Kudu Cloud features by patching gates | Not legitimate (see Cloud audit). |
| "Secure erase" claims on SSDs | Not technically guaranteed; disclose limits or limit to HDDs/encrypted-volume guidance. |

## 3. Differentiation summary

Kudu already has breadth. HakTrak can differentiate on **trust and clarity**: reversible-by-default cleanup, explained items, honest measurements, offline security checks, and a permissions-aware onboarding — rather than on adding more tools.
