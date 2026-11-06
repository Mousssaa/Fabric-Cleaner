import { app, safeStorage } from 'electron'
import { join } from 'path'
import type { IntelligenceProviderId } from '../../../shared/intelligence'
import { IntelligenceConfigStore, type SecretCipher } from './config-store'
import { StubLeakRadarAdapter, StubVirusTotalAdapter } from './stub-providers'
import type { LeakRadarAdapter, VirusTotalAdapter } from './types'

/**
 * Electron safeStorage-backed cipher. On Linux, the `basic_text` backend is
 * not real encryption, so it counts as unavailable and secrets are refused.
 */
export const safeStorageCipher: SecretCipher = {
  available(): boolean {
    try {
      if (!safeStorage.isEncryptionAvailable()) return false
      if (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')
        return false
      return true
    } catch {
      return false
    }
  },
  encrypt(plain: string): string {
    return safeStorage.encryptString(plain).toString('base64')
  },
  decrypt(stored: string): string {
    return safeStorage.decryptString(Buffer.from(stored, 'base64'))
  }
}

let store: IntelligenceConfigStore | null = null

export function getIntelligenceStore(): IntelligenceConfigStore {
  if (!store) {
    const base = app.isPackaged
      ? app.getPath('userData')
      : join(app.getPath('userData'), 'FabricCleaner-Dev')
    store = new IntelligenceConfigStore(join(base, 'intelligence.json'), safeStorageCipher)
  }
  return store
}

export interface ProviderRegistry {
  virustotal: VirusTotalAdapter
  leakradar: LeakRadarAdapter
}

/**
 * Single place where adapters are chosen. Today both are stubs that never
 * touch the network. A later release swaps in real clients here (direct or
 * via the HakTrak Gateway) without changing any caller.
 */
export function createProviderRegistry(s: IntelligenceConfigStore): ProviderRegistry {
  const cfg = (id: IntelligenceProviderId) => () => s.runtimeConfig(id)
  return {
    virustotal: new StubVirusTotalAdapter(cfg('virustotal')),
    leakradar: new StubLeakRadarAdapter(cfg('leakradar'))
  }
}

let registry: ProviderRegistry | null = null

export function getProviderRegistry(): ProviderRegistry {
  if (!registry) registry = createProviderRegistry(getIntelligenceStore())
  return registry
}
