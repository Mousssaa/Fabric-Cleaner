import { BrowserWindow, dialog, ipcMain } from 'electron'
import { readFile, stat } from 'fs/promises'
import { basename } from 'path'
import { IPC } from '../../shared/channels'
import { threatMonitor } from '../services/threat-monitor'
import {
  clearBlacklist,
  loadBlacklist,
  parseLocalBlocklist,
  saveBlacklist
} from '../services/threat-blacklist-store'
import type { LocalThreatMonitorStatus } from '../../shared/types'

const MAX_IMPORT_BYTES = 50 * 1024 * 1024

type WindowGetter = () => BrowserWindow | null

let running = false

function status(): LocalThreatMonitorStatus {
  const bl = loadBlacklist()
  return {
    running,
    blocklist: bl
      ? {
          version: bl.version,
          updatedAt: bl.updatedAt,
          domains: bl.domains.length,
          ips: bl.ips.length,
          cidrs: bl.cidrs.length
        }
      : null
  }
}

/**
 * Local-only Threat Monitor. It compares this machine's active connections
 * and DNS cache against a blocklist the user imports from disk. Nothing is
 * downloaded and nothing is reported anywhere.
 */
export function registerThreatMonitorIpc(getWindow: WindowGetter): void {
  threatMonitor.setThreatCallback((snapshot) => {
    const win = getWindow()
    if (win && !win.isDestroyed()) win.webContents.send(IPC.THREAT_MONITOR_UPDATED, snapshot)
  })

  ipcMain.handle(IPC.THREAT_MONITOR_GET_SNAPSHOT, () => threatMonitor.getThreatSnapshot())
  ipcMain.handle(IPC.THREAT_MONITOR_STATUS, () => status())

  ipcMain.handle(IPC.THREAT_MONITOR_SET_ENABLED, async (_event, enabled: unknown) => {
    if (typeof enabled !== 'boolean') throw new Error('Invalid value')
    if (enabled && !running) {
      running = true
      await threatMonitor.start()
    } else if (!enabled && running) {
      running = false
      threatMonitor.stop()
    }
    return status()
  })

  ipcMain.handle(IPC.THREAT_MONITOR_IMPORT_BLOCKLIST, async () => {
    const win = getWindow()
    const options: Electron.OpenDialogOptions = {
      title: 'Import a local blocklist',
      properties: ['openFile'],
      filters: [
        { name: 'Blocklists', extensions: ['txt', 'json', 'list', 'hosts'] },
        { name: 'All files', extensions: ['*'] }
      ]
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return { ok: false, canceled: true }
    const file = result.filePaths[0]
    const info = await stat(file)
    if (!info.isFile() || info.size > MAX_IMPORT_BYTES)
      return { ok: false, error: 'The file is not a regular file or is larger than 50 MB.' }
    const parsed = parseLocalBlocklist(await readFile(file, 'utf8'), basename(file))
    if (!parsed || parsed.domains.length + parsed.ips.length + parsed.cidrs.length === 0)
      return { ok: false, error: 'No valid domains, IP addresses or CIDR ranges were found.' }
    saveBlacklist(parsed)
    if (running) await threatMonitor.reloadBlacklist()
    return { ok: true, status: status() }
  })

  ipcMain.handle(IPC.THREAT_MONITOR_CLEAR_BLOCKLIST, async () => {
    clearBlacklist()
    if (running) {
      running = false
      threatMonitor.stop()
    }
    return status()
  })
}

export function stopThreatMonitor(): void {
  if (running) {
    running = false
    threatMonitor.stop()
  }
}
