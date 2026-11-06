import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import {
  INTELLIGENCE_MODES,
  INTELLIGENCE_PROVIDER_IDS,
  type IntelligenceConnectionMode,
  type IntelligenceProviderId,
  type IntelligenceProviderPublicConfig,
  type IntelligenceProviderUpdate,
  type IntelligencePublicConfig
} from '../../../shared/intelligence'
import { notReady } from './stub-providers'
import type { ProviderRuntimeConfig } from './types'

/** Encrypts/decrypts secrets. Backed by Electron safeStorage in the app. */
export interface SecretCipher {
  available(): boolean
  encrypt(plain: string): string
  decrypt(stored: string): string
}

interface StoredProvider {
  enabled: boolean
  endpoint: string
  /** safeStorage ciphertext (base64). Never plaintext. */
  apiKey: string | null
  apiKeyHint: string | null
}

interface StoredConfig {
  version: 1
  mode: IntelligenceConnectionMode
  gateway: { url: string; token: string | null; tokenHint: string | null }
  providers: Record<IntelligenceProviderId, StoredProvider>
}

function defaults(): StoredConfig {
  const provider = (): StoredProvider => ({
    enabled: false,
    endpoint: '',
    apiKey: null,
    apiKeyHint: null
  })
  return {
    version: 1,
    mode: 'disabled',
    gateway: { url: '', token: null, tokenHint: null },
    providers: { virustotal: provider(), leakradar: provider() }
  }
}

export class IntelligenceInputError extends Error {}

const SECRET_PATTERN = /^[\x21-\x7e]{8,256}$/

export function validateSecret(value: unknown, label: string): string {
  if (typeof value !== 'string' || !SECRET_PATTERN.test(value.trim()))
    throw new IntelligenceInputError(`${label} must be 8–256 printable characters with no spaces.`)
  return value.trim()
}

/** Empty string is allowed (= provider default). Otherwise HTTPS only. */
export function validateEndpoint(value: unknown, label: string): string {
  if (value === '' || value === undefined) return ''
  if (typeof value !== 'string' || value.length > 2048)
    throw new IntelligenceInputError(`${label} is not a valid URL.`)
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    throw new IntelligenceInputError(`${label} is not a valid URL.`)
  }
  if (url.protocol !== 'https:') throw new IntelligenceInputError(`${label} must use https://.`)
  if (url.username || url.password)
    throw new IntelligenceInputError(`${label} must not contain credentials.`)
  return url.toString()
}

function hint(secret: string): string {
  return secret.slice(-4)
}

export class IntelligenceConfigStore {
  private cache: StoredConfig | null = null

  constructor(
    private readonly filePath: string,
    private readonly cipher: SecretCipher
  ) {}

  private read(): StoredConfig {
    if (this.cache) return this.cache
    const base = defaults()
    try {
      if (existsSync(this.filePath)) {
        const raw = JSON.parse(readFileSync(this.filePath, 'utf8')) as Partial<StoredConfig>
        if (raw && typeof raw === 'object') {
          if (INTELLIGENCE_MODES.includes(raw.mode as IntelligenceConnectionMode))
            base.mode = raw.mode as IntelligenceConnectionMode
          if (raw.gateway && typeof raw.gateway === 'object') {
            base.gateway.url = typeof raw.gateway.url === 'string' ? raw.gateway.url : ''
            base.gateway.token = typeof raw.gateway.token === 'string' ? raw.gateway.token : null
            base.gateway.tokenHint =
              typeof raw.gateway.tokenHint === 'string' ? raw.gateway.tokenHint : null
          }
          for (const id of INTELLIGENCE_PROVIDER_IDS) {
            const p = raw.providers?.[id]
            if (!p || typeof p !== 'object') continue
            base.providers[id] = {
              enabled: p.enabled === true,
              endpoint: typeof p.endpoint === 'string' ? p.endpoint : '',
              apiKey: typeof p.apiKey === 'string' ? p.apiKey : null,
              apiKeyHint: typeof p.apiKeyHint === 'string' ? p.apiKeyHint : null
            }
          }
        }
      }
    } catch {
      // Corrupt file: fall back to defaults (local mode, nothing configured).
    }
    this.cache = base
    return base
  }

  private write(cfg: StoredConfig): void {
    const dir = dirname(this.filePath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    const tmp = `${this.filePath}.${process.pid}.tmp`
    writeFileSync(tmp, JSON.stringify(cfg, null, 2), { encoding: 'utf8', mode: 0o600 })
    renameSync(tmp, this.filePath)
    this.cache = cfg
  }

  private encryptOrThrow(secret: string): string {
    if (!this.cipher.available())
      throw new IntelligenceInputError(
        'Secure storage (system keychain) is unavailable, so the key was not saved.'
      )
    return this.cipher.encrypt(secret)
  }

  private decryptOrNull(stored: string | null): string | null {
    if (!stored || !this.cipher.available()) return null
    try {
      return this.cipher.decrypt(stored)
    } catch {
      return null
    }
  }

  runtimeConfig(id: IntelligenceProviderId): ProviderRuntimeConfig {
    const cfg = this.read()
    const p = cfg.providers[id]
    return {
      mode: cfg.mode,
      enabled: p.enabled,
      endpoint: p.endpoint,
      apiKey: this.decryptOrNull(p.apiKey),
      gateway: { url: cfg.gateway.url, token: this.decryptOrNull(cfg.gateway.token) }
    }
  }

  publicConfig(): IntelligencePublicConfig {
    const cfg = this.read()
    const providers = {} as Record<IntelligenceProviderId, IntelligenceProviderPublicConfig>
    for (const id of INTELLIGENCE_PROVIDER_IDS) {
      const p = cfg.providers[id]
      const runtime: ProviderRuntimeConfig = {
        mode: cfg.mode,
        enabled: p.enabled,
        endpoint: p.endpoint,
        // Only presence matters for the state; never decrypt for the renderer.
        apiKey: p.apiKey ? 'present' : null,
        gateway: { url: cfg.gateway.url, token: cfg.gateway.token ? 'present' : null }
      }
      providers[id] = {
        id,
        enabled: p.enabled,
        endpoint: p.endpoint,
        hasApiKey: !!p.apiKey,
        apiKeyHint: p.apiKey ? p.apiKeyHint : null,
        state: notReady(id, runtime).status
      }
    }
    return {
      mode: cfg.mode,
      gateway: {
        url: cfg.gateway.url,
        hasToken: !!cfg.gateway.token,
        tokenHint: cfg.gateway.token ? cfg.gateway.tokenHint : null
      },
      providers,
      secureStorageAvailable: this.cipher.available()
    }
  }

  setProvider(id: unknown, update: unknown): IntelligencePublicConfig {
    if (!INTELLIGENCE_PROVIDER_IDS.includes(id as IntelligenceProviderId))
      throw new IntelligenceInputError('Unknown provider.')
    if (!update || typeof update !== 'object' || Array.isArray(update))
      throw new IntelligenceInputError('Invalid settings.')
    const u = update as IntelligenceProviderUpdate
    for (const key of Object.keys(u))
      if (!['enabled', 'endpoint', 'apiKey'].includes(key))
        throw new IntelligenceInputError('Invalid settings.')
    const cfg = structuredClone(this.read())
    const p = cfg.providers[id as IntelligenceProviderId]
    if (u.enabled !== undefined) {
      if (typeof u.enabled !== 'boolean') throw new IntelligenceInputError('Invalid settings.')
      p.enabled = u.enabled
    }
    if (u.endpoint !== undefined) p.endpoint = validateEndpoint(u.endpoint, 'Endpoint')
    if (u.apiKey !== undefined) {
      const key = validateSecret(u.apiKey, 'API key')
      p.apiKey = this.encryptOrThrow(key)
      p.apiKeyHint = hint(key)
    }
    this.write(cfg)
    return this.publicConfig()
  }

  clearProvider(id: unknown): IntelligencePublicConfig {
    if (!INTELLIGENCE_PROVIDER_IDS.includes(id as IntelligenceProviderId))
      throw new IntelligenceInputError('Unknown provider.')
    const cfg = structuredClone(this.read())
    cfg.providers[id as IntelligenceProviderId] = defaults().providers.virustotal
    this.write(cfg)
    return this.publicConfig()
  }

  setMode(mode: unknown): IntelligencePublicConfig {
    if (!INTELLIGENCE_MODES.includes(mode as IntelligenceConnectionMode))
      throw new IntelligenceInputError('Unknown connection mode.')
    const cfg = structuredClone(this.read())
    cfg.mode = mode as IntelligenceConnectionMode
    this.write(cfg)
    return this.publicConfig()
  }

  setGateway(update: unknown): IntelligencePublicConfig {
    if (!update || typeof update !== 'object' || Array.isArray(update))
      throw new IntelligenceInputError('Invalid settings.')
    const u = update as { url?: unknown; token?: unknown; clearToken?: unknown }
    const cfg = structuredClone(this.read())
    if (u.url !== undefined) cfg.gateway.url = validateEndpoint(u.url, 'Gateway URL')
    if (u.clearToken === true) {
      cfg.gateway.token = null
      cfg.gateway.tokenHint = null
    } else if (u.token !== undefined) {
      const token = validateSecret(u.token, 'Gateway token')
      cfg.gateway.token = this.encryptOrThrow(token)
      cfg.gateway.tokenHint = hint(token)
    }
    this.write(cfg)
    return this.publicConfig()
  }
}
