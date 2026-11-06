/**
 * The seven pillars of the Fabric Cleaner stage, plus Preferences.
 *
 * Every route belongs to exactly one module. The module decides the ambient
 * colour of the whole window (see stage.css) and which glass illustration a
 * landing stage shows. Colours are HakTrak Networks' own palette.
 */
export type StageModule =
  | 'smartcare'
  | 'cleanup'
  | 'protection'
  | 'performance'
  | 'applications'
  | 'spacelens'
  | 'activity'
  | 'preferences'

const routeModules: Record<string, StageModule> = {
  '/': 'smartcare',
  '/cleaner': 'cleanup',
  '/registry': 'cleanup',
  '/network': 'cleanup',
  '/schedules': 'cleanup',
  '/malware': 'protection',
  '/privacy': 'protection',
  '/threat-monitor': 'protection',
  '/firewall': 'protection',
  '/performance': 'performance',
  '/startup': 'performance',
  '/services': 'performance',
  '/game-mode': 'performance',
  '/disk-maintenance': 'performance',
  '/disk-repair': 'performance',
  '/uninstaller': 'applications',
  '/app-space': 'applications',
  '/updates': 'applications',
  '/drivers': 'applications',
  '/debloater': 'applications',
  '/context-menu': 'applications',
  '/disk': 'spacelens',
  '/storage-history': 'spacelens',
  '/large-files': 'spacelens',
  '/duplicates': 'spacelens',
  '/downloads': 'spacelens',
  '/empty-folders': 'spacelens',
  '/file-shredder': 'spacelens',
  '/history': 'activity',
  '/recovery': 'activity',
  '/settings': 'preferences',
  '/about': 'preferences'
}

export function moduleForPath(pathname: string): StageModule {
  return routeModules[pathname] ?? 'smartcare'
}

/** Primary / secondary glow colours for each module's glass art. */
export const modulePalette: Record<StageModule, { a: string; b: string; deep: string }> = {
  smartcare: { a: '#00E5FF', b: '#00B4D8', deep: '#060B14' },
  cleanup: { a: '#00C2FF', b: '#3B82F6', deep: '#0A192F' },
  protection: { a: '#00F5A0', b: '#00C2B8', deep: '#071A1E' },
  performance: { a: '#7B61FF', b: '#B39BFF', deep: '#0B0C20' },
  applications: { a: '#38BDF8', b: '#6366F1', deep: '#091326' },
  spacelens: { a: '#F59E0B', b: '#06B6D4', deep: '#0F1418' },
  activity: { a: '#5EEAD4', b: '#818CF8', deep: '#0A1220' },
  preferences: { a: '#00E5FF', b: '#94A3B8', deep: '#0A1018' }
}
