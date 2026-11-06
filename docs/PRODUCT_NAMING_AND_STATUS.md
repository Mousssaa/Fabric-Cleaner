# Product Naming & Status Note

Date: 2026-11-06

This note finalizes the naming and integration direction decided by the project owner after the Phase 0/1 documents and `PHASE1_SCOPE_ALIGNMENT_ADDENDUM.md` were written. Where earlier documents say "HakTrak Desktop" or "HakTrak System Cleaner", read the names below.

| Item | Final value |
|---|---|
| Product name | **Fabric Cleaner** |
| Company / publisher | **HakTrak Networks** |
| App ID | `com.haktrak.fabric-cleaner` |
| Repository | https://github.com/Mousssaa/Fabric-Cleaner |
| Upstream foundation | Kudu (AdventDevInc/kudu) at `942af64`, imported with full history (PR #2, merge commit). MIT `LICENSE` © Advent Development Inc is kept unchanged. |

## Operating model

- **100% local-first.** Kudu Cloud (device linking, remote commands, telemetry, diagnostics upload, cloud YARA polling, subscription/billing gates) is removed. Every core feature runs offline.
- **Delayed plug-in architecture for VirusTotal & LeakRadar.** The app ships a provider registry and stub adapters under `src/main/services/intelligence/`, plus a Settings card for credentials and connection mode. Providers stay in `pending_setup` state and make **no network calls** until a later stage wires real API calls (status of both providers remains "PENDING API DOCUMENTATION" for live integration).
- A future **HakTrak API Gateway** URL can be configured; the earlier architecture's recommendation (provider keys held by a backend gateway, not in the desktop app) remains the target for production. Direct-API mode is labelled for local testing only.

## Merge record

- PR #2 (`migration/kudu-942af64`) merged into `main` with a merge commit: `bbc8885`.
- PR #1 (`docs/phase-0-1-architecture`) updated against `main` with a merge commit (no rebase), then merged with a merge commit.
