import { mkdtempSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { isPackaged: false, getPath: () => tmpdir() },
  safeStorage: {
    isEncryptionAvailable: () => false,
    getSelectedStorageBackend: () => 'basic_text'
  }
}))

import { IntelligenceConfigStore, type SecretCipher } from './config-store'
import { createProviderRegistry } from './provider-registry'

const cipher = (available = true): SecretCipher => ({
  available: () => available,
  encrypt: (s) => 'enc:' + Buffer.from(s).toString('base64'),
  decrypt: (s) => Buffer.from(s.slice(4), 'base64').toString()
})

describe('intelligence providers', () => {
  let dir: string
  let file: string
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'fc-intel-'))
    file = join(dir, 'intelligence.json')
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  it('defaults to local mode with nothing configured and makes no network calls', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const store = new IntelligenceConfigStore(file, cipher())
    const cfg = store.publicConfig()
    expect(cfg.mode).toBe('disabled')
    expect(cfg.providers.virustotal.hasApiKey).toBe(false)
    expect(cfg.providers.leakradar.state).toBe('local_mode')
    const r = createProviderRegistry(store)
    await expect(r.virustotal.lookupFileHash('a'.repeat(64))).resolves.toMatchObject({
      configured: false,
      status: 'local_mode'
    })
    store.setMode('direct')
    await expect(r.leakradar.lookupEmailExposure('a@b.co')).resolves.toMatchObject({
      configured: false,
      status: 'pending_setup'
    })
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('stores keys encrypted and never exposes them in the public config', () => {
    const store = new IntelligenceConfigStore(file, cipher())
    store.setMode('direct')
    const cfg = store.setProvider('virustotal', { enabled: true, apiKey: 'vt-secret-key-1234' })
    expect(cfg.providers.virustotal).toMatchObject({
      hasApiKey: true,
      apiKeyHint: '1234',
      state: 'integration_pending'
    })
    expect(JSON.stringify(cfg)).not.toContain('vt-secret-key')
    expect(readFileSync(file, 'utf8')).not.toContain('vt-secret-key')
    expect(store.runtimeConfig('virustotal').apiKey).toBe('vt-secret-key-1234')
    store.clearProvider('virustotal')
    expect(store.publicConfig().providers.virustotal.hasApiKey).toBe(false)
  })

  it('refuses to store secrets when secure storage is unavailable', () => {
    const store = new IntelligenceConfigStore(file, cipher(false))
    expect(() => store.setProvider('leakradar', { apiKey: 'lr-secret-key-0000' })).toThrow(
      /Secure storage/
    )
  })

  it('validates inputs', () => {
    const store = new IntelligenceConfigStore(file, cipher())
    expect(() => store.setProvider('other', {})).toThrow()
    expect(() => store.setProvider('virustotal', { apiKey: 'short' })).toThrow()
    expect(() => store.setProvider('virustotal', { endpoint: 'http://insecure' })).toThrow()
    expect(() => store.setProvider('virustotal', { extra: 1 })).toThrow()
    expect(() => store.setMode('cloud')).toThrow()
    expect(() => store.setGateway({ url: 'https://user:pw@gw.example' })).toThrow()
    expect(store.setGateway({ url: 'https://gateway.example/api' }).gateway.url).toBe(
      'https://gateway.example/api'
    )
  })
})
