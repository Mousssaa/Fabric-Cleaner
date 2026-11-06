import { create } from 'zustand'
import type { FabricSettings } from '@shared/types'

interface SettingsState {
  settings: FabricSettings
  loaded: boolean
  setSettings: (settings: FabricSettings) => void
  updateSettings: (partial: Partial<FabricSettings>) => void
}

export const defaultSettings: FabricSettings = {
  theme: 'system',
  dashboardView: 'simple',
  language: 'en',
  minimizeToTray: false,
  showNotificationOnComplete: true,
  showThreatNotifications: true,
  runAtStartup: false,
  autoUpdate: false,
  autoRestart: true,
  updateCheckIntervalHours: 4,
  softwareUpdaterNotifications: true,
  scheduleNudgeDismissed: false,
  preferElevatedLaunch: false,
  cleaner: {
    skipRecentMinutes: 60,
    secureDelete: false,
    disposalMode: 'trash',
    closeBrowsersBeforeClean: false,
    createRestorePoint: false,
    protectRecycleBin: true,
    keepDeletionLog: false
  },
  exclusions: [],
  ignoredSoftwareUpdates: [],
  ignoredDriverUpdates: [],
  backupPath: '',
  backupMode: 'targeted',
  schedule: {
    enabled: false,
    frequency: 'weekly',
    day: 1,
    hour: 9
  },
  schedules: [],
  windowsPackageManager: 'winget',
  windowsPackageManagers: ['winget', 'choco', 'scoop', 'npm'],
  gameMode: {
    enabledOptimizations: [
      'svc-wsearch',
      'svc-sysmain',
      'proc-kill-updaters',
      'mem-clear-standby',
      'sys-focus-assist',
      'sys-power-plan',
      'sys-prevent-sleep',
      'sys-disable-game-bar',
      'sys-disable-fse-opt',
      'net-flush-dns'
    ],
    customProcessKillList: [],
    autoDetect: false,
    autoDeactivate: true,
    customGameProcesses: []
  },
  registryIgnoredTweaks: [],
  malwareAllowlist: []
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: defaultSettings,
  loaded: false,
  setSettings: (settings) => set({ settings, loaded: true }),
  updateSettings: (partial) =>
    set((s) => ({
      settings: {
        ...s.settings,
        ...partial,
        cleaner: { ...s.settings.cleaner, ...(partial.cleaner ?? {}) },
        schedule: { ...s.settings.schedule, ...(partial.schedule ?? {}) },
        // schedules is an array — replace entirely when provided
        schedules: partial.schedules ?? s.settings.schedules,
        gameMode: { ...s.settings.gameMode, ...(partial.gameMode ?? {}) }
      }
    }))
}))

/** Re-fetch settings from main process into the store */
export function refreshSettings(): void {
  window.fabric
    ?.settingsGet?.()
    .then((settings) => {
      useSettingsStore.getState().setSettings(settings)
    })
    .catch(() => {})
}

// Hydrate settings eagerly so pages that depend on them (e.g. ThreatMonitorPage)
// don't see stale defaults before the user visits Settings.
if (typeof window !== 'undefined' && window.fabric) {
  refreshSettings()
}
