import { ipcMain } from 'electron'
import { IPC } from '../../shared/channels'
import { INTELLIGENCE_PROVIDER_IDS, type IntelligenceProviderId } from '../../shared/intelligence'
import { getIntelligenceStore, getProviderRegistry } from '../services/intelligence'
import { IntelligenceInputError } from '../services/intelligence/config-store'

/** Input errors are shown to the user; anything else gets a generic message. */
async function guarded<T>(work: () => T | Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (err) {
    if (err instanceof IntelligenceInputError) throw new Error(err.message)
    console.error('[intelligence] settings update failed:', err)
    throw new Error('Could not save threat intelligence settings.')
  }
}

export function registerIntelligenceIpc(): void {
  ipcMain.handle(IPC.INTELLIGENCE_GET_CONFIG, () =>
    guarded(() => getIntelligenceStore().publicConfig())
  )
  ipcMain.handle(IPC.INTELLIGENCE_SET_PROVIDER, (_e, id: unknown, update: unknown) =>
    guarded(() => getIntelligenceStore().setProvider(id, update))
  )
  ipcMain.handle(IPC.INTELLIGENCE_CLEAR_PROVIDER, (_e, id: unknown) =>
    guarded(() => getIntelligenceStore().clearProvider(id))
  )
  ipcMain.handle(IPC.INTELLIGENCE_SET_MODE, (_e, mode: unknown) =>
    guarded(() => getIntelligenceStore().setMode(mode))
  )
  ipcMain.handle(IPC.INTELLIGENCE_SET_GATEWAY, (_e, update: unknown) =>
    guarded(() => getIntelligenceStore().setGateway(update))
  )
  // Readiness probe used by the Settings card. Goes through the adapter so the
  // UI exercises the same path real lookups will use; stubs never hit the network.
  ipcMain.handle(IPC.INTELLIGENCE_PROVIDER_STATUS, (_e, id: unknown) =>
    guarded(async () => {
      if (!INTELLIGENCE_PROVIDER_IDS.includes(id as IntelligenceProviderId))
        throw new IntelligenceInputError('Unknown provider.')
      const r = getProviderRegistry()
      return id === 'virustotal'
        ? r.virustotal.lookupFileHash('0'.repeat(64))
        : r.leakradar.lookupDomainExposure('example.com')
    })
  )
}
