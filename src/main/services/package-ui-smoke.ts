import { app } from 'electron'
import type { BrowserWindow } from 'electron'
import { writeFileSync } from 'fs'
import { isAbsolute } from 'path'
import { isTrustedRendererUrl } from '../security/ipc-guard'
import { getBundledRulePaths } from './yara-rules-store'

/**
 * Packaged-app UI smoke test (CI only).
 *
 * `--fc-smoke-test=<absolute result.json>` makes a normal GUI launch drive its
 * own renderer through every route, then write a JSON report and exit (0 on
 * success, 1 on any failure). It exercises what the CLI smoke cannot: the
 * file:// IPC sender guard, the preload bridge, React rendering of each page,
 * and YARA-X compiling the bundled rule pack inside the packaged worker.
 *
 * It only reads state and navigates; it never starts a scan or a clean. It is
 * always paired with a disposable `--fc-data-dir` by scripts/package-ui-smoke-test.js.
 */

const FLAG = '--fc-smoke-test='
const TOTAL_TIMEOUT_MS = 240_000

/** Every page route in App.tsx, including the seven dock pillars and Preferences. */
export const SMOKE_ROUTES = [
  '/',
  '/cleaner',
  '/registry',
  '/context-menu',
  '/startup',
  '/storage-history',
  '/disk',
  '/duplicates',
  '/app-space',
  '/large-files',
  '/downloads',
  '/empty-folders',
  '/file-shredder',
  '/disk-repair',
  '/disk-maintenance',
  '/network',
  '/malware',
  '/threat-monitor',
  '/game-mode',
  '/performance',
  '/uninstaller',
  '/history',
  '/recovery',
  '/settings',
  '/about',
  '/privacy',
  '/services',
  '/firewall',
  '/debloater',
  '/updates',
  '/schedules',
  '/drivers'
] as const

export function getSmokeResultPath(argv: string[] = process.argv): string | null {
  const arg = argv.find((a) => a.startsWith(FLAG))
  if (!arg) return null
  const path = arg.slice(FLAG.length)
  return path && isAbsolute(path) ? path : null
}

interface RouteReport {
  route: string
  hash: string
  textLength: number
  errorBoundary: boolean
}

/** Runs in the renderer. Plain JS: it is sent through executeJavaScript. */
function rendererProbe(routes: readonly string[]): string {
  return `(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    const until = async (fn, ms) => {
      const end = Date.now() + ms
      while (Date.now() < end) { if (await fn()) return true; await sleep(100) }
      return false
    }
    const report = { failures: [] }
    report.mounted = await until(() => (document.getElementById('root')?.childElementCount ?? 0) > 0, 30000)
    const api = window.fabric
    report.bridgeType = typeof api
    report.bridgeKeys = api && typeof api === 'object' ? Object.keys(api).length : 0
    try {
      const settings = await api.settingsGet()
      report.ipc = { ok: true, language: settings && settings.language }
    } catch (e) {
      report.ipc = { ok: false, error: String(e && e.message || e) }
    }
    report.language = document.documentElement.lang || null
    report.dir = document.documentElement.dir || null
    const routes = []
    for (const route of ${JSON.stringify(routes)}) {
      location.hash = '#' + route
      await sleep(1200)
      const text = document.body ? document.body.innerText : ''
      routes.push({
        route,
        hash: location.hash,
        textLength: text.trim().length,
        errorBoundary: text.includes('Something went wrong')
      })
      if (text.includes('PRODUCT PREVIEW') || text.includes('SAMPLE DATA')) {
        report.failures.push('Preview banner rendered in the packaged app on ' + route)
      }
    }
    report.routes = routes
    location.hash = '#/'
    let yara = null
    await until(async () => {
      try { yara = await api.malwareYaraInfo() } catch (e) { yara = { error: String(e && e.message || e) }; return true }
      return yara && (yara.available || yara.engine === 'error')
    }, 120000)
    report.yara = yara
    return JSON.stringify(report)
  })()`
}

export function attachPackagedUiSmoke(
  win: BrowserWindow,
  trustedRendererUrl: URL,
  resultPath: string
): void {
  const wc = win.webContents
  const consoleErrors: string[] = []
  const failures: string[] = []
  let finished = false

  const finish = (extra: Record<string, unknown> = {}): void => {
    if (finished) return
    finished = true
    const ok = failures.length === 0
    const result = {
      ok,
      version: app.getVersion(),
      electron: process.versions.electron,
      platform: process.platform,
      arch: process.arch,
      isPackaged: app.isPackaged,
      bundledRuleFiles: getBundledRulePaths().length,
      failures,
      consoleErrors,
      ...extra
    }
    try {
      writeFileSync(resultPath, JSON.stringify(result, null, 2))
    } catch (err) {
      console.error('[smoke] could not write result', err)
    }
    app.exit(ok ? 0 : 1)
  }
  const fail = (message: string, extra?: Record<string, unknown>): void => {
    failures.push(message)
    finish(extra)
  }

  const timer = setTimeout(() => fail('Timed out'), TOTAL_TIMEOUT_MS)
  timer.unref?.()

  // Electron >= 35 passes a details object; older versions pass positional args.
  wc.on('console-message', (...args: unknown[]) => {
    const first = args[0] as { level?: unknown; message?: unknown }
    const level = typeof first?.level === 'string' ? first.level : args[1]
    const message = typeof first?.message === 'string' ? first.message : args[2]
    if (level === 'error' || level === 3) consoleErrors.push(String(message))
  })
  wc.on('render-process-gone', (_e, details) => fail(`Renderer gone: ${details.reason}`))
  wc.on('preload-error', (_e, path, error) => fail(`Preload error in ${path}: ${error.message}`))
  wc.on('did-fail-load', (_e, code, description, url, isMainFrame) => {
    if (isMainFrame) fail(`Load failed (${code} ${description}) for ${url}`)
  })
  wc.on('unresponsive', () => fail('Renderer became unresponsive'))

  wc.once('did-finish-load', async () => {
    const frameUrl = wc.mainFrame.url
    const trustedFrame = isTrustedRendererUrl(frameUrl, trustedRendererUrl)
    if (!trustedFrame) failures.push(`IPC guard does not trust the loaded renderer: ${frameUrl}`)
    try {
      const report = JSON.parse(await wc.executeJavaScript(rendererProbe(SMOKE_ROUTES), true)) as {
        mounted: boolean
        bridgeType: string
        bridgeKeys: number
        ipc: { ok: boolean; language?: string; error?: string }
        routes: RouteReport[]
        yara: { available?: boolean; rulesLoaded?: number; error?: string } | null
        failures: string[]
      }
      failures.push(...report.failures)
      if (!report.mounted) failures.push('React root never mounted')
      if (report.bridgeType !== 'object' || report.bridgeKeys < 50) {
        failures.push(`Preload bridge missing (window.fabric: ${report.bridgeType})`)
      }
      if (!report.ipc.ok) failures.push(`IPC round-trip failed: ${report.ipc.error}`)
      for (const r of report.routes) {
        if (r.errorBoundary) failures.push(`Error boundary shown on ${r.route}`)
        if (r.textLength === 0) failures.push(`Blank page on ${r.route}`)
      }
      if (!report.yara?.available || !(report.yara.rulesLoaded && report.yara.rulesLoaded > 0)) {
        failures.push(`YARA engine did not load bundled rules: ${JSON.stringify(report.yara)}`)
      }
      if (consoleErrors.length > 0)
        failures.push(`${consoleErrors.length} renderer console error(s)`)
      clearTimeout(timer)
      finish({ frameUrl, trustedFrame, renderer: report })
    } catch (err) {
      fail(`Renderer probe threw: ${err instanceof Error ? err.message : String(err)}`, {
        frameUrl,
        trustedFrame
      })
    }
  })
}
