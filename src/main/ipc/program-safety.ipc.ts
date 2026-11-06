import { ipcMain } from 'electron'
import { IPC } from '../../shared/channels'
import type { StartupSafetyResult } from '../../shared/types'

/**
 * Safety ratings used to come from Kudu Cloud. Fabric Cleaner is local-first,
 * so no ratings are fetched: the UI falls back to its local knowledge base and
 * signature checks. A future reputation provider (see services/intelligence)
 * can fill this in once it is configured.
 */
export function registerProgramSafetyIpc(): void {
  ipcMain.handle(IPC.PROGRAM_SAFETY_FETCH, async (): Promise<StartupSafetyResult> => ({
    ratings: [],
    pending: 0
  }))
}
