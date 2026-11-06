import { shell } from 'electron'
import { lstat, realpath } from 'fs/promises'
import { homedir } from 'os'
import { posix, win32 } from 'path'
import type { DeletionOrigin } from '../../shared/types'

/**
 * ExecutionEngine: the single pathway every cleanup deletion goes through.
 *
 * - Trash-first: by default items are moved to the OS Trash / Recycle Bin so
 *   they can be restored. If the Trash cannot take an item, the operation
 *   fails closed (it is NOT silently deleted permanently).
 * - Protected paths: OS roots, system binaries and user-profile roots are
 *   refused on Windows, macOS and Linux, both as given and after resolving
 *   symlinks.
 * - Link safety: a symlink, junction or other reparse point as the target is
 *   refused, so a cleanup can never follow a link out of the scanned tree.
 * - Local history: each decision is kept in a bounded in-memory ledger that
 *   the deletion log / receipts can read. Nothing leaves the device.
 */

export type DisposalMode = 'trash' | 'permanent'

export interface DisposalResult {
  path: string
  success: boolean
  mode: DisposalMode
  reason?: string
  failures?: Array<{ path: string; reason: string }>
}

export interface DisposalRecord {
  at: string
  path: string
  mode: DisposalMode
  origin: DeletionOrigin
  success: boolean
  reason?: string
}

export interface ExecutionDeps {
  platform: NodeJS.Platform
  home: string
  env: NodeJS.ProcessEnv
  trash: (path: string) => Promise<void>
  realpath: (path: string) => Promise<string>
  isLink: (path: string) => Promise<boolean>
}

const defaultDeps = (): ExecutionDeps => ({
  platform: process.platform,
  home: homedir(),
  env: process.env,
  trash: (p) => shell.trashItem(p),
  realpath: (p) => realpath(p),
  isLink: async (p) => (await lstat(p)).isSymbolicLink()
})

/** Path semantics follow the platform being evaluated, not the host. */
const pathFor = (platform: NodeJS.Platform): typeof posix => (platform === 'win32' ? win32 : posix)

function key(path: string, platform: NodeJS.Platform): string {
  let p = pathFor(platform).normalize(path)
  while (p.length > 1 && (p.endsWith('/') || p.endsWith('\\')) && !/^[A-Za-z]:[\\/]$/.test(p))
    p = p.slice(0, -1)
  // Windows and default macOS volumes are case-insensitive.
  return platform === 'win32' || platform === 'darwin' ? p.toLowerCase() : p
}

/** Paths that may never be removed themselves (their contents may be cleaned). */
function exactRoots(d: ExecutionDeps): string[] {
  const common = [d.home]
  if (d.platform === 'win32') {
    const drive = (d.env.SystemDrive || 'C:') + '\\'
    return [
      ...common,
      drive,
      d.env.WINDIR,
      d.env.ProgramFiles || d.env.PROGRAMFILES,
      d.env['ProgramFiles(x86)'] || d.env['PROGRAMFILES(X86)'],
      d.env.ProgramData || d.env.PROGRAMDATA,
      d.env.APPDATA,
      d.env.LOCALAPPDATA,
      d.env.USERPROFILE,
      d.env.SystemDrive ? `${d.env.SystemDrive}\\Users` : 'C:\\Users'
    ].filter((p): p is string => !!p)
  }
  const posix = [
    '/',
    '/home',
    '/Users',
    '/var',
    '/tmp',
    '/opt',
    '/Applications',
    '/Library',
    '/private',
    '/private/var',
    '/private/tmp',
    `${d.home}/Library`,
    `${d.home}/Documents`,
    `${d.home}/Desktop`,
    `${d.home}/Downloads`,
    `${d.home}/.config`,
    `${d.home}/.local`,
    `${d.home}/.local/share`
  ]
  return [...common, ...posix]
}

/** Subtrees whose contents are never cleanup targets. */
function protectedTrees(d: ExecutionDeps): string[] {
  if (d.platform === 'win32') {
    const win = d.env.WINDIR || 'C:\\Windows'
    return [
      `${win}\\System32`,
      `${win}\\SysWOW64`,
      `${win}\\WinSxS`,
      `${win}\\servicing`,
      `${win}\\Boot`,
      `${d.env.SystemDrive || 'C:'}\\Boot`,
      `${d.env.SystemDrive || 'C:'}\\Recovery`
    ]
  }
  const trees = [
    '/bin',
    '/sbin',
    '/usr/bin',
    '/usr/sbin',
    '/usr/lib',
    '/etc',
    '/boot',
    '/dev',
    '/proc',
    '/sys'
  ]
  if (d.platform === 'darwin') trees.push('/System', '/usr/libexec', '/private/etc')
  else trees.push('/lib', '/lib64', '/usr/lib64', '/snap/core', '/var/lib/dpkg', '/var/lib/rpm')
  return trees
}

export function protectedReason(path: string, d: ExecutionDeps = defaultDeps()): string | null {
  const P = pathFor(d.platform)
  if (!path || !P.isAbsolute(path)) return 'not-absolute'
  const k = key(P.resolve(path), d.platform)
  for (const root of exactRoots(d)) if (k === key(root, d.platform)) return 'protected-root'
  for (const tree of protectedTrees(d)) {
    const t = key(tree, d.platform)
    if (k === t || k.startsWith(t + P.sep)) return 'protected-system-path'
  }
  return null
}

const LEDGER_LIMIT = 2000
const ledger: DisposalRecord[] = []

export function getDisposalHistory(): DisposalRecord[] {
  return [...ledger]
}

function record(r: DisposalRecord): void {
  ledger.push(r)
  if (ledger.length > LEDGER_LIMIT) ledger.splice(0, ledger.length - LEDGER_LIMIT)
}

export interface DisposeOptions {
  mode: DisposalMode
  origin?: DeletionOrigin
  /** Permanent deleter (file-utils safeDelete). Injected to avoid an import cycle. */
  permanentDelete: (path: string) => Promise<{
    success: boolean
    reason?: string
    failures?: Array<{ path: string; reason: string }>
  }>
  deps?: ExecutionDeps
}

export async function dispose(path: string, opts: DisposeOptions): Promise<DisposalResult> {
  const d = opts.deps ?? defaultDeps()
  const origin = opts.origin ?? 'local'
  const done = (r: DisposalResult): DisposalResult => {
    record({
      at: new Date().toISOString(),
      path,
      mode: r.mode,
      origin,
      success: r.success,
      ...(r.reason ? { reason: r.reason } : {})
    })
    return r
  }

  const blocked = protectedReason(path, d)
  if (blocked) return done({ path, success: false, mode: opts.mode, reason: blocked })

  try {
    if (await d.isLink(path))
      return done({ path, success: false, mode: opts.mode, reason: 'link-not-followed' })
    const real = await d.realpath(path)
    const realBlocked = protectedReason(real, d)
    if (realBlocked) return done({ path, success: false, mode: opts.mode, reason: realBlocked })
  } catch (err: any) {
    if (err?.code === 'ENOENT') return done({ path, success: true, mode: opts.mode })
    // Fall through: the deleter reports access errors with its own reasons.
  }

  if (opts.mode === 'trash') {
    try {
      await d.trash(path)
      return done({ path, success: true, mode: 'trash' })
    } catch {
      // Fail closed: never fall back to permanent deletion silently.
      return done({ path, success: false, mode: 'trash', reason: 'trash-unavailable' })
    }
  }

  const r = await opts.permanentDelete(path)
  return done({ path, mode: 'permanent', ...r })
}
