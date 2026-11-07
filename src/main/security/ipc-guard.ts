import { ipcMain } from 'electron'
import type { IpcMainEvent, IpcMainInvokeEvent, WebFrameMain } from 'electron'
import { pathToFileURL } from 'url'
import { join } from 'path'

/**
 * Centralised IPC sender validation.
 *
 * Every `ipcMain.handle` / `ipcMain.on` registration made after
 * `installIpcSenderGuard()` runs is wrapped so the handler only executes for
 * messages sent by the app's own top-level renderer document. Messages from
 * sub-frames, navigated-away pages or any other origin are rejected before
 * the handler sees the payload. Payload validation stays in each handler
 * (see services/ipc-validation.ts).
 */

type AnyEvent = IpcMainEvent | IpcMainInvokeEvent

let trustedRendererUrl: URL | null = null
let installed = false

/** Resolve what the renderer is loaded from: the dev server or the bundled index.html. */
export function resolveTrustedRendererUrl(
  devServerUrl: string | undefined,
  rendererDir: string
): URL {
  if (devServerUrl) return new URL(devServerUrl)
  return pathToFileURL(join(rendererDir, 'index.html'))
}

/**
 * Canonical form of a file: URL's location, so two spellings of the same file
 * compare equal. Node's pathToFileURL and Chromium's loadFile URL can encode
 * the same path differently (percent-encoding of spaces, non-ASCII or reserved
 * characters such as "#" in a user name), and Windows paths are
 * case-insensitive (drive letter, "Program Files"). Only file: URLs reach this.
 */
function canonicalFileLocation(url: URL, platform: NodeJS.Platform): string | null {
  let path: string
  try {
    path = decodeURIComponent(url.pathname)
  } catch {
    return null
  }
  // A literal "/" or "\" smuggled in as %2F / %5C would otherwise alias another path.
  if (/%2f|%5c/i.test(url.pathname)) return null
  const location = `${url.host}${path}`
  return platform === 'win32' ? location.toLowerCase() : location
}

/** True when `frameUrl` is the app's own renderer document (ignoring hash/query). */
export function isTrustedRendererUrl(
  frameUrl: string,
  trusted: URL,
  platform: NodeJS.Platform = process.platform
): boolean {
  let url: URL
  try {
    url = new URL(frameUrl)
  } catch {
    return false
  }
  if (trusted.protocol === 'file:') {
    if (url.protocol !== 'file:') return false
    const actual = canonicalFileLocation(url, platform)
    return actual !== null && actual === canonicalFileLocation(trusted, platform)
  }
  return url.origin === trusted.origin
}

export function isTrustedSender(event: AnyEvent): boolean {
  if (!trustedRendererUrl) return false
  let frame: WebFrameMain | null | undefined
  try {
    frame = event.senderFrame
  } catch {
    return false
  }
  // Only the top-level frame of our own window may talk to the main process.
  if (!frame || frame.parent) return false
  return isTrustedRendererUrl(frame.url, trustedRendererUrl)
}

export function installIpcSenderGuard(trusted: URL): void {
  trustedRendererUrl = trusted
  if (installed) return
  installed = true

  const originalHandle = ipcMain.handle.bind(ipcMain)
  const originalOn = ipcMain.on.bind(ipcMain)
  const originalOnce = ipcMain.once.bind(ipcMain)

  ipcMain.handle = ((channel: string, listener: (e: IpcMainInvokeEvent, ...a: any[]) => any) =>
    originalHandle(channel, (event, ...args) => {
      if (!isTrustedSender(event)) {
        throw new Error(`Rejected IPC "${channel}" from an untrusted sender`)
      }
      return listener(event, ...args)
    })) as typeof ipcMain.handle

  const wrapListener =
    (channel: string, listener: (e: IpcMainEvent, ...a: any[]) => void) =>
    (event: IpcMainEvent, ...args: any[]) => {
      if (!isTrustedSender(event)) {
        console.warn(`[ipc-guard] Rejected IPC "${channel}" from an untrusted sender`)
        return
      }
      listener(event, ...args)
    }

  ipcMain.on = ((channel: string, listener: (e: IpcMainEvent, ...a: any[]) => void) =>
    originalOn(channel, wrapListener(channel, listener))) as typeof ipcMain.on
  ipcMain.once = ((channel: string, listener: (e: IpcMainEvent, ...a: any[]) => void) =>
    originalOnce(channel, wrapListener(channel, listener))) as typeof ipcMain.once
}
