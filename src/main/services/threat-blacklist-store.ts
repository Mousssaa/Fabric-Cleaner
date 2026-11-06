import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import type { ThreatBlacklist } from './security-posture-types'

const MAX_ENTRIES_PER_ARRAY = 500_000
const MAX_IMPORT_BYTES = 50 * 1024 * 1024 // 50 MB

let _dataDir: string | null = null

function getDataDir(): string {
  if (!_dataDir) {
    _dataDir = app.isPackaged
      ? app.getPath('userData')
      : join(app.getPath('userData'), 'FabricCleaner-Dev')
  }
  return _dataDir
}

function getBlacklistPath(): string {
  return join(getDataDir(), 'threat-blacklist.json')
}

export function validateBlacklist(raw: unknown): ThreatBlacklist | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null

  const obj = raw as Record<string, unknown>
  if (typeof obj.version !== 'string' || obj.version.length === 0 || obj.version.length > 100)
    return null
  if (typeof obj.updatedAt !== 'string' || obj.updatedAt.length === 0 || obj.updatedAt.length > 100)
    return null

  if (!Array.isArray(obj.domains) || obj.domains.length > MAX_ENTRIES_PER_ARRAY) return null
  if (!Array.isArray(obj.ips) || obj.ips.length > MAX_ENTRIES_PER_ARRAY) return null
  if (!Array.isArray(obj.cidrs) || obj.cidrs.length > MAX_ENTRIES_PER_ARRAY) return null

  // Validate all entries are strings with reasonable length
  for (const arr of [obj.domains, obj.ips, obj.cidrs]) {
    for (const item of arr as unknown[]) {
      if (typeof item !== 'string' || item.length === 0 || item.length > 500) return null
    }
  }

  return {
    version: obj.version,
    updatedAt: obj.updatedAt,
    domains: obj.domains as string[],
    ips: obj.ips as string[],
    cidrs: obj.cidrs as string[]
  }
}

export function loadBlacklist(): ThreatBlacklist | null {
  try {
    const path = getBlacklistPath()
    if (!existsSync(path)) return null
    const raw = readFileSync(path, 'utf-8')
    return validateBlacklist(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveBlacklist(bl: ThreatBlacklist): void {
  const dir = getDataDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const path = getBlacklistPath()
  const tmpPath = path + '.tmp'
  writeFileSync(tmpPath, JSON.stringify(bl), 'utf-8')
  renameSync(tmpPath, path)
}

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/
const DOMAIN = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i

/**
 * Parse a user-supplied local blocklist. Fabric Cleaner never downloads
 * blocklists; the user imports one from disk. Two formats are accepted:
 *  - the JSON shape `{ version, updatedAt, domains, ips, cidrs }`, or
 *  - plain text, one domain / IP / CIDR per line (`#` starts a comment).
 */
export function parseLocalBlocklist(text: string, sourceName: string): ThreatBlacklist | null {
  if (text.length > MAX_IMPORT_BYTES) return null
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) {
    try {
      return validateBlacklist(JSON.parse(trimmed))
    } catch {
      return null
    }
  }
  const domains = new Set<string>()
  const ips = new Set<string>()
  const cidrs = new Set<string>()
  for (const rawLine of trimmed.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim().toLowerCase()
    if (!line) continue
    // Accept hosts-file style lines such as "0.0.0.0 bad.example".
    const token = line.split(/\s+/).pop() as string
    if (token.includes('/')) {
      const [addr, bits] = token.split('/')
      const n = Number(bits)
      if ((IPV4.test(addr) && n >= 0 && n <= 32) || (addr.includes(':') && n >= 0 && n <= 128))
        cidrs.add(token)
    } else if (IPV4.test(token) || (token.includes(':') && /^[0-9a-f:]+$/.test(token))) {
      ips.add(token)
    } else if (DOMAIN.test(token)) {
      domains.add(token)
    }
  }
  return validateBlacklist({
    version: `local:${sourceName}`.slice(0, 100),
    updatedAt: new Date().toISOString(),
    domains: [...domains],
    ips: [...ips],
    cidrs: [...cidrs]
  })
}

export function clearBlacklist(): void {
  const path = getBlacklistPath()
  if (existsSync(path)) unlinkSync(path)
}
