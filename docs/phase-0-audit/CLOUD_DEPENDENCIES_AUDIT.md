# Cloud and Network Dependencies Audit (Phase 0)

Source: Kudu `main` @ `942af64`. Method: searched all non-test source under `src/` for URLs, `fetch(`, `pusher`, HTTP servers and update providers; then read each call site. Nothing was disabled or modified.

## 1. Inventory of network endpoints in source

| Endpoint / provider | Where | Purpose |
|---|---|---|
| `https://cloud.usekudu.com` (default server) | `src/main/services/cloud-agent.ts:66`, `ipc/malware-scanner.ipc.ts:59` | Kudu Cloud API base |
| `GET {server}/api/connect` | `cloud-agent.ts:836-850` | Discovers WebSocket (Reverb) host/port/key and API base |
| `POST /devices/{id}/register` | `cloud-agent.ts:453`, `:547` | Device registration |
| `POST /devices/{id}/telemetry` | `cloud-agent.ts:1094` | Periodic telemetry (`telemetryIntervalSec: 60` default) |
| `POST /devices/{id}/health-report` | `cloud-agent.ts` (30-min interval, `HEALTH_REPORT_INTERVAL_MS`) | Health report |
| `POST /devices/{id}/threat-alert` | `cloud-agent.ts:1743` | Threat Monitor alerts |
| `POST /devices/{id}/command-result` | `cloud-agent.ts` | Remote command results |
| `GET/PATCH/DELETE` vulnerabilities, breach monitor, safety ratings | `cloud-agent.ts:275-370`, `:1056` | CVE, breach, program/startup safety |
| `/api/yara-rules` | `services/yara-rules-store.ts:22`, `:198`, `:322` | Cloud YARA rule bundles |
| Blacklist URL supplied by server command | `cloud-agent.ts:3800-3850`, `services/threat-blacklist-store.ts:84` | Threat Monitor domain/IP blacklist |
| `https://cloud.usekudu.com/api/devices/{id}/performance-diagnostics/{id}` | `services/diagnostics-cloud.ts:52-53` | Diagnostics upload/analysis |
| WebSocket (pusher-js → Laravel Reverb), channel `private-device.{deviceId}` | `cloud-agent.ts:655-760` | Real-time remote commands |
| GitHub Releases (`AdventDevInc/kudu`) | `electron-builder.yml` `publish: github`, `services/auto-updater.ts` | App auto-update |
| Package repositories (winget, choco, scoop, npm, Homebrew, apt/dnf/pacman) | `services/software-updater.ts` | Software updater |
| Windows Update | `ipc/driver-manager.ipc.ts`, cloud `windows-update-*` commands | Driver/OS updates |
| `https://usekudu.com`, `/sponsors`, `/help/startup-failed`, `https://github.com/adventdevinc/kudu[/issues]`, `.../releases/latest` | `AboutPage.tsx:196`, `SettingsPage.tsx:56`, `SchedulesPage.tsx:231`, others | Links opened in the external browser |
| `https://cloud.usekudu.com/organisation/billing` (7 places) | `CloudPage.tsx:30`, `CveScannerPage.tsx:30`, `ThreatMonitorPage.tsx:67,126`, `BreachMonitorPage.tsx:209,304`, `components/perf/DiagnosticsAccess.tsx:82` | Upsell links |
| `https://nvd.nist.gov/vuln/detail/{cve}` | `CveScannerPage.tsx:480` | External link only |
| Social share intents (x.com, reddit, bsky, t.me, wa.me) | `renderer/src/lib/cleanup-share.ts` | External links only |
| Local HTTP server `0.0.0.0:{port}` `/metrics`, `/health` | `src/main/cli.ts:2040-2072` | Prometheus exporter (CLI opt-in) |
| CI/release: VirusTotal, Chocolatey, winget, website deploy hook, Azure signing, Apple notarization | `.github/workflows/release.yml:114-131`, `:221-224` | Build infrastructure only (not in app) |

No analytics SDK, crash-reporting SDK (Sentry etc.), remote-config service, or external AI service was found in `package.json` or source. `SECURITY.md` states "No telemetry"; that is true for telemetry **unless the user links Kudu Cloud**, after which telemetry is sent by default (see §4). However, two contacts happen without any opt-in: the anonymous YARA rule poll to `cloud.usekudu.com` every 6 hours (§3) and the update check to GitHub when auto-update is on.

## 2. Category A — core features that already run locally

All of the following make no network calls in their code paths (based on the absence of `fetch`/`net`/cloud imports in their IPC/service modules; the malware scanner is local *except* for its rule source, see §3):

System, browser, app, gaming cleaners; native maintenance (uv/pnpm prune use local tools); Recycle Bin; registry cleaner/backups; context menu; environment; network cleanup (local OS commands); database optimizer; custom folders; duplicates; large files; downloads review; empty folders; shortcuts; file shredder; disk analyzer; App Space; storage history; disk repair (Win); TRIM; startup manager; service manager; uninstaller; debloater; restore point; recovery; receipts/history; schedules; malware scanner with **bundled/cached** YARA rules and local heuristics; Privacy Shield; privacy traces; app privacy audit; firewall audit; performance monitor; local diagnostics recording; Game Mode; dashboard; CLI (except daemon).

## 3. Category B — optional remote services

| Feature | Files | Remote | Data transmitted | Mandatory? | Offline behaviour | Local alternative feasible? | Recommendation |
|---|---|---|---|---|---|---|---|
| App auto-update | `auto-updater.ts:71-72` (`autoDownload = daemonMode \|\| settings.autoUpdate`, `autoInstallOnAppQuit = true`), `:127` (check on every packaged start), `:43-46` (skipped for portable and non-AppImage Linux) | GitHub Releases of `AdventDevInc/kudu` | Standard update request (IP, version, platform) | The **check always runs** on start and every `updateCheckIntervalHours`; the `autoUpdate` setting only controls download | Update check fails silently; app works | n/a | **Replace** with HakTrak-owned release feed (GitHub repo or HTTPS server) with code signing. Must change before any HakTrak build is distributed, otherwise HakTrak installs would update to Kudu. |
| Software updater | `software-updater.ts` | Package manager repositories | Package lists/queries to the managers' own sources | Optional per action | Check fails; nothing else affected | Already local orchestration of OS tools | **Keep** (legitimate integration); disclose. |
| Driver / Windows Update | `driver-manager.ipc.ts` | Microsoft Update | Handled by Windows | Optional | Fails gracefully (RFI) | n/a | **Keep** as optional. |
| External links (help, sponsors, NVD, social share) | renderer pages | Opens browser | URL only | Optional | n/a | n/a | **Replace** with HakTrak URLs after Brand Kit/infrastructure exists; remove sponsor & social share unless product wants them. |
| Cloud YARA rules — **automatic, for every user** | `ipc/malware-scanner.ipc.ts:2682-2683` (`startPeriodicRuleChecks(CLOUD_SERVER_URL, …)` with comment "runs for all users, not just cloud-linked"), `yara-rules-store.ts:21` (every 6 h), `:182-270`, `:335` ("Rules are no longer bundled — they must be downloaded from the cloud") | `cloud.usekudu.com/api/yara-rules` | Anonymous GET with `X-Kudu-Rules-Version` header; reveals IP, timing and installed rule version | **Not user-controllable** — starts 5 s after IPC registration and repeats every 6 hours, regardless of cloud link | Without network, YARA has only previously cached rules; on a fresh offline install YARA has **no rules** and only PE heuristics/publisher checks run (Inference from code; not executed) | Yes — curated open rule sets (e.g., YARA-Forge, signature-base) bundled and signed by HakTrak, subject to their licences | **Reimplement locally** with a HakTrak-signed, bundled rule set and an opt-in HakTrak update feed. Note: this contradicts `SECURITY.md`'s "No network requests… only update checks and optional cloud features". |

## 4. Category C — features that require a remote backend (Kudu Cloud)

All of these require a Kudu Cloud API key and, for several, an active paid subscription (HTTP 402 handling at `cloud-agent.ts:70-75`, `:584`; tier badges at `Sidebar.tsx:127-164`). The backend is Advent Development Inc.'s proprietary service; its server code is **not** in this repository.

| Feature | Files | Data transmitted (from code) | Works offline? | Local alternative? | Recommendation |
|---|---|---|---|---|---|
| Device link / registration | `cloud-agent.ts:438-470` | `machineId`, app version, **hostname**, OS distro, isServer | No | n/a | **Remove from v1 scope.** |
| Telemetry & health reports | `cloud-agent.ts:1060-1100`, `:1299` (disk health every 30 ticks), `:1313` (process list every 10 ticks) | System metrics snapshot; **process list** and **disk health** by default (`shareProcessList: true`, `shareDiskHealth: true` at `settings-store.ts:83-84`); threat-monitor data (`shareThreatMonitor: true`) | No | n/a | Remove. If a HakTrak fleet product is ever built, all sharing must default to **off**. |
| Remote commands (36 types, `cloud-agent.ts:1789-1826`) | `cloud-agent.ts` | Command results incl. installed apps, event log, network config, system info | No | n/a | **Remove from v1.** This is RMM functionality with a large blast radius (see Security doc). |
| Threat Monitor | `services/threat-monitor.ts`, started at `cloud-agent.ts:1610`; blacklist via `threat-blacklist-store.ts` | Threat snapshots (flagged connections, DNS) | No (blacklist + activation are cloud) | **Yes** — local engine already exists; a local blacklist (e.g., abuse.ch URLhaus/ThreatFox feeds, licence permitting) could be bundled/updated by a HakTrak feed | **Reimplement independently** as a local feature *after* licence review of feeds. Do not re-enable the existing gated path by patching the gate. |
| CVE / vulnerability scanner | `ipc/cve-scanner.ipc.ts`, `cloud-agent.ts:275`, `:4008-4030` | **Full installed-application inventory** (name, publisher, version) | No | **Yes** — local matching against NVD/OSV data is feasible but hard (CPE mapping of Windows app names is noisy). OSV is better for packages; NVD API has rate limits & terms. | **Reimplement independently** later (P1/P2) with clear "possible match" language; or keep out of v1. |
| Breach monitor | `ipc/breach-monitor.ipc.ts`, `cloud-agent.ts:339-370` | User **email addresses** | No | Partially — Have I Been Pwned API requires a paid key and its terms; k-anonymity is available only for passwords, not emails | **Remove from v1** or replace with a legitimate HIBP integration via a HakTrak backend (key must not ship in client). |
| Program / startup safety ratings | `ipc/program-safety.ipc.ts:7`, `ipc/startup-safety.ipc.ts:7` | Installed programs / startup items (Inference: names sent for lookup) | No | Partially — local heuristics (signature, publisher, path) already exist in malware/startup code | **Replace** with a local signed-publisher + known-item knowledge base (like `shared/service-safety-kb.ts`). |
| Performance diagnostics upload/analysis | `services/diagnostics-cloud.ts:40-70` | Diagnostic recording up to 1 MB | Recording yes, analysis no | Yes — local summarisation of recorded data | **Reimplement locally** (show the local summary; drop upload). |
| Headless daemon | `src/main/daemon.ts`, `scripts/install.sh` | Same as agent | No | n/a | **Remove from v1** (re-evaluate if HakTrak builds its own fleet service). |
| Cloud page & billing links | `CloudPage.tsx`, 7 billing URLs | n/a | n/a | n/a | **Remove**; HakTrak must not deep-link to Kudu billing. |

## 5. Category D — uncertain dependency behaviour

| Item | Why uncertain | Next step |
|---|---|---|
| Bundled YARA rules at build time | `scripts/fetch-yara-rules.js` fetches from `cloud.usekudu.com` into `resources/yara-rules/`, but the script is not referenced from `package.json` or any workflow (`rg fetch-yara` found nothing) and `resources/yara-rules/` is absent; runtime comment says rules are no longer bundled | Confirm by running an offline malware scan in a VM in Phase 1. |
| `virustotal.com` in `malware-scanner.ipc.ts:641` | It is in a list of well-known legitimate domains (facebook, paypal, github…) — not an API client | No action; no VirusTotal client exists in the app. |
| `.deb` auto-update | electron-updater supports deb via `DebUpdater` only in recent versions; `deb-postinstall.sh` exists | Runtime test on Debian/Ubuntu VM. |
| Windows Update calls | COM/PowerShell usage not fully traced | Trace in Phase 1. |
| Social share image generation | Pure client SVG (`cleanup-share.ts:139`), but includes brand URL | No network; product decision. |

## 6. Licensing and terms considerations

- Kudu source is MIT (© 2026 Advent Development Inc — `LICENSE`). Using the code is permitted; **using Kudu Cloud, its API, its billing, or its rule feeds is not covered by the MIT licence** and would require an agreement with Advent. HakTrak must not ship builds that talk to `cloud.usekudu.com`.
- The paid-tier gating lives on the server (HTTP 402) and in UI badges. Per Master Instructions, it must **not** be bypassed; local replacements must be independent implementations.
- Third-party threat feeds and YARA rule sets each have their own licences (some non-commercial). Review before bundling.
- NVD API terms require attribution and rate-limit compliance; OSV is Apache-2.0 data with per-source terms.

## 7. Security and privacy risks of the current cloud design (summary)

Details in `SECURITY_RISK_ASSESSMENT.md`:

- API key is the sole credential for a channel that can trigger cleanup, malware deletion, driver/software installs, SFC/DISM, service/startup/privacy changes and shutdown — gated by four opt-in toggles (default **off**) (`settings-store.ts:86-90`, `cloud-agent.ts:1757-1787`). Read-only commands (event log, installed apps, network config) are always allowed once linked.
- Commands are authenticated by channel authorization with the API key; no per-command signature from the server was found (`rg signature|hmac` found none in `cloud-agent.ts`). Trust is fully in the server and TLS.
- API key encrypted with `safeStorage` but **falls back to plaintext** when encryption is unavailable (`settings-store.ts:159-170`), e.g., headless Linux without a keyring. `--api-key` on the command line is visible to other local users via the process list.

## 8. Overall recommendation

For HakTrak v1: **local-only product**. Remove the Kudu Cloud agent, daemon, cloud pages and billing links from the shipped build (in Phase 4/5, not now), replace the update feed with HakTrak infrastructure, and rebuild Threat Monitor, CVE awareness, safety ratings and diagnostics analysis as local features where feasible. Any future HakTrak cloud must be opt-in, default-share-nothing, with signed commands and a documented data inventory.
