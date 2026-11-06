<p align="center">
  <img src="resources/brand/fabric-cleaner.svg" alt="Fabric Cleaner" width="112" />
</p>

<h1 align="center">Fabric Cleaner</h1>

<p align="center">
  Local-first system cleaner and security toolkit for Windows, macOS, and Linux.<br />
  By <strong>HakTrak Networks</strong>.
</p>

<p align="center">
  <a href="CLI.md"><b>CLI</b></a> &nbsp;&middot;&nbsp;
  <a href="rules/RULES.md"><b>Cleaner rules</b></a> &nbsp;&middot;&nbsp;
  <a href="docs/PRODUCT_NAMING_AND_STATUS.md"><b>Naming &amp; status</b></a>
</p>

## Overview

Fabric Cleaner reclaims disk space, scans for malware, and hardens privacy settings. Every core feature runs on your device, offline, with no account and no API keys.

- **Cleaning:** system, browser, app, and game caches; registry and startup management; disk analyzer; duplicate finder; uninstaller; scheduled scans; and a scriptable [CLI](CLI.md).
- **Trash-first:** cleanup goes to the system Trash / Recycle Bin by default through a single `ExecutionEngine` that refuses protected system paths and symbolic links. Permanent deletion is an explicit setting.
- **Local malware scanning:** YARA-X with rules bundled in `resources/yara-rules/` plus any `.yar` files you add to the user rules folder.
- **Local Threat Monitor:** watches network connections against blocklists you import from a file. Nothing is downloaded.
- **Least privilege:** Windows builds run `asInvoker`; administrator rights are requested only for actions that need them.
- **Threat intelligence, prepared:** Settings → _Threat Intelligence APIs_ holds VirusTotal and LeakRadar credentials (encrypted with the OS keychain). No requests are sent to either service in this release.

Available in 31 languages, with English and Arabic maintained first.

## Build from source

Requires Node.js 22 or later.

```bash
npm ci
npm run dev         # development mode
npm run typecheck
npm run lint
npm test
npm run build       # production bundle
npm run package     # installers via electron-builder
```

Packaging is configured in [electron-builder.yml](electron-builder.yml). Release builds run from the manual `release.yml` workflow; nothing publishes automatically.

## Project layout

| Path                                    | Contents                                       |
| --------------------------------------- | ---------------------------------------------- |
| `src/main/`                             | Electron main process, IPC handlers, services  |
| `src/main/services/execution-engine.ts` | Trash-first, protected-path file disposal      |
| `src/main/services/intelligence/`       | VirusTotal, LeakRadar and gateway adapter stubs |
| `src/main/security/ipc-guard.ts`        | IPC sender validation                          |
| `src/preload/`                          | `window.fabric` bridge (context isolated)      |
| `src/renderer/`                         | React UI                                       |
| `resources/yara-rules/`                 | Bundled YARA rules                             |
| `resources/brand/`                      | Fabric Cleaner and HakTrak Networks emblems    |
| `docs/`                                 | Architecture, audit, and status notes          |

## Credits

Fabric Cleaner is built on [Kudu](https://github.com/AdventDevInc/kudu) by Advent Development Inc., released under the MIT License. The original copyright notice is kept in [LICENSE](LICENSE), as the license requires. Fabric Cleaner's changes are by HakTrak Networks.

## Disclaimer

Fabric Cleaner removes files from your system by design. Review items before removal. The software is provided "as is" without warranty, and no liability is accepted for data loss or system instability.

## License

[MIT](LICENSE)
