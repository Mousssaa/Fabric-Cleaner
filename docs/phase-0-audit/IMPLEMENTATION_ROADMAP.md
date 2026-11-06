# Implementation Roadmap (Phase 0 output)

Based on the Phase 0 findings. No dates or team capacity are assumed. Phases follow the Master Instructions (§10). Each phase ends at a gate requiring explicit approval.

## Decisions required before Phase 1 work can be finalised

| ID | Decision | Options | Recommendation | Blocks |
|---|---|---|---|---|
| D1 | Baseline to fork from | `v3.11.0` (`7c51d0d`) or `main` (`942af64`, +6 commits) | Fork at `v3.11.0`; cherry-pick reviewed later commits (browser-close prompt, new rules) | Everything |
| D2 | Kudu Cloud & daemon | Remove from HakTrak / replace later with HakTrak backend / keep (not legitimate without agreement) | **Remove** from v1; build local replacements where feasible | Phase 1 architecture, Phase 4 |
| D3 | Windows privilege model | Keep `requireAdministrator` / move to `asInvoker` + elevated helper | **`asInvoker` + helper** | Phase 1 architecture, Phase 5 |
| D4 | Deletion policy | Permanent (today) / Trash-first for user data, permanent for caches | **Trash-first for user data**, explicit label for caches | Phase 1 safety model, Phase 4 |
| D5 | v1 feature scope | Keep all ~60 / curated set | Curated: drop or rework Game Mode memory ops, health score, cloud-only pages; decide on registry cleaner, debloater, driver cleanup, environment cleaner | Phase 1 scope, Phase 3 navigation |
| D6 | Identity | appId, executable/CLI name, data directory, update channel | Decide once with the Brand Kit; never change after first release | Phase 2/7 |
| D7 | Remote rule/feed infrastructure | None (static bundles per release) / HakTrak signed feed | Start with signed bundles per release; add feed later | Phase 4 malware, Phase 7 |

## Phase 1 — Product & technical architecture (no UI redesign)

Goals: approve scope (D1–D5), safety model, and target architecture.

Deliverables:
1. Product scope document: feature keep/rework/remove list derived from `EXISTING_FEATURES_MATRIX.md`.
2. **Safety model spec**: central `DeletionPolicy` (cache / user-data / system classes), single protected-path module shared by cleaner, shredder, empty-folders, uninstaller, leftovers; Trash/quarantine rules; receipts as the single source of truth.
3. **Electron hardening spec**: navigation guards, sender validation wrapper for `ipcMain.handle`, permission handler, per-channel validation inventory (224 channels).
4. **Privilege architecture**: `asInvoker` main app + elevated helper (Windows), polkit/`SMAppService` helpers instead of root GUI (Linux/macOS).
5. **Cloud removal plan**: dependency map of `cloud-agent.ts` consumers (Threat Monitor start, CVE, breach, safety ratings, diagnostics, YARA polling, CLI `config set cloud.*`, daemon) and local replacements.
6. **Platform interface plan** (see `PLATFORM_COMPATIBILITY.md` §6).
7. Test strategy: fixture-tree destructive tests, IPC security tests, E2E harness choice (Playwright for Electron), VM matrix.

Dependencies: D1–D5. Risks: underestimating coupling in `cloud-agent.ts` (4,040 lines) and Windows logic inside IPC modules.

Gate: approval of scope, safety model, architecture.

## Phase 2 — Brand & design system

**Blocked on the HakTrak Brand Kit.** Inputs: logo variants, colours, typography, iconography, usage rules. Outputs: design tokens replacing `globals.css` variables, icon sets for all OS sizes (see `BRANDING_MIGRATION_PLAN.md` §3.2), naming decisions (D6). No code changes to features.

## Phase 3 — Core UI & navigation

Depends on Phases 1–2. Rebuild navigation around the approved scope; implement the full workflow (onboarding with permission checks → overview → scan → results → review → confirmation → execution → completion report → recovery → settings). All loading/empty/error/permission-denied/partial-failure states. Accessibility (keyboard, screen-reader labels; `@axe-core/react` is already a devDependency). RTL verification for Arabic.

Testing: component tests (add jsdom/happy-dom environment to Vitest), Playwright E2E smoke on all three OS.

## Phase 4 — Feature implementation (incremental)

Suggested order, each as a small reviewed PR series:

1. **Safety core** (P0): `DeletionPolicy`, central protected paths, Trash-first for user-data categories, receipts/recovery center. Fixture-based tests for every rule category.
2. **Cloud removal** (P0): remove agent, daemon, cloud pages, billing links, YARA polling; keep code paths compiling with local stubs that are clearly labelled "unavailable" in UI until replaced.
3. **Offline malware rules** (P0): signed bundled YARA set (licence-reviewed), signature verification with pinned key.
4. **Honesty fixes** (P0): replace health score; remove/rework Game Mode memory ops; shredder/SSD disclosure.
5. **Permissions onboarding** (P0).
6. **Local replacements** (P1): startup/program safety via local KB + signatures; local diagnostics summary; Threat Monitor with a licensed local blacklist (optional).
7. **Opportunities P1** from `PRODUCT_OPPORTUNITIES.md` (security health checks, extension inventory, disk visualisation, startup impact, scheduled maintenance 2.0, rule transparency).
8. **Platform gaps** (P1/P2): Linux autostart, macOS/Linux uninstaller execution, macOS Login Items/Background Items, flatpak/snap updates.

## Phase 5 — Security hardening

- Implement and test S-01, S-03, S-04, S-17 mitigations (if not done in Phase 4).
- PowerShell interpolation audit / migration (S-11).
- Per-channel IPC validation completeness; fuzz tests for validators.
- Logs PII review; deletion-log/receipt encryption option.
- Update pipeline: HakTrak signing, update metadata integrity, AppImage signature strategy.
- Dependency review: `npm audit` on clean install, native module provenance, licence gate retained.

## Phase 6 — Cross-platform QA

Independent verification on: Windows 11 x64, Windows 11 ARM64 (physical device), Windows 10 x64 (if supported — decide), macOS Intel + Apple Silicon (current and previous major), Ubuntu LTS x64/arm64, Fedora, Debian, Arch (best effort). Destructive tests only in disposable VMs/fixtures. Add macOS and Linux x64 to packaged smoke tests (currently missing).

## Phase 7 — Packaging & release

HakTrak identifiers (D6), signing certificates, notarization, update feed, release notes, `LICENSE` + `THIRD_PARTY_NOTICES` + About/Legal attribution, website/help links, distribution channels (winget/choco decisions). Fix `conventional-changelog-angular` drift (repo `CLAUDE.md` requires `^8`; `package.json` now `^9.4.0`) if upstream release tooling is reused.

## Phase 8 — Android

Separate native Kotlin/Compose project, only when explicitly approved.

## Cross-cutting testing requirements

| Area | Requirement |
|---|---|
| Destructive ops | Fixture directories (with symlinks, hard links, junctions, long paths, locked files, permission-denied) per OS; never on host |
| IPC security | Tests that a non-app frame is rejected; validators reject malformed input |
| Rules | Schema validation (`npm run validate:rules`) + parity report in CI |
| UI | Component tests + Playwright E2E for the main workflow on 3 OS |
| Packaging | Smoke test packaged app on all shipped OS/arch combinations |
| Honesty | Every number in UI traceable to a measurement; tests asserting "unknown" states render |

## Platform milestones

1. Windows x64 feature-complete & hardened (largest existing coverage).
2. macOS (both arches) with permissions onboarding and parity for cleaner, startup, services, malware, privacy.
3. Linux x64/arm64 with autostart fix, package-manager uninstall, AppImage+deb.
4. Windows ARM64 physical-device validation.

## Key technical risks

- Large, coupled modules (`cloud-agent.ts`, `cli.ts`, `registry-cleaner.ipc.ts`, `malware-scanner.ipc.ts`) — refactor only with tests in place.
- Privilege model change (D3) touches many features that assume admin on Windows.
- YARA rule licensing may limit what can be bundled commercially.
- Locale rebrand across 31 languages requires native review.
- Upstream divergence: the fork will drift from Kudu quickly; define a cherry-pick policy for upstream security fixes.
