import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sidebar } from './Sidebar'
import { AdminBanner } from './AdminBanner'
import { useSettingsStore } from '@/stores/settings-store'
import { usePlatform } from '@/hooks/usePlatform'
import { moduleForPath, type StageModule } from './modules'

const moduleLabelKeys: Record<StageModule, string> = {
  smartcare: 'smartCare',
  cleanup: 'cleanupPillar',
  protection: 'securityHeading',
  performance: 'performance',
  applications: 'applications',
  spacelens: 'spaceLens',
  activity: 'activityAndRecovery',
  preferences: 'settings'
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common')
  const location = useLocation()
  const { platform } = usePlatform()
  const stageModule = moduleForPath(location.pathname)
  const handleSkip = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault()
    const el = document.getElementById('main-content')
    if (el) {
      el.focus()
      el.scrollIntoView()
    }
  }, [])

  return (
    <div
      className="app-shell h-screen overflow-hidden"
      data-platform={platform}
      data-module={stageModule}
    >
      <a href="#" className="skip-nav" onClick={handleSkip}>
        {t('skipToMainContent', 'Skip to main content')}
      </a>

      <header
        className="app-titlebar drag-region"
        aria-label={t('windowTitlebar', 'Fabric Cleaner window titlebar')}
      >
        <div className="app-location-pill" aria-hidden="true">
          <i />
          <span>{t(`sidebar:${moduleLabelKeys[stageModule]}`)}</span>
        </div>
        <div className="app-titlebar-drag flex-1" aria-hidden="true" />
        <div className="app-titlebar-actions no-drag flex h-full items-center">
          <AppearanceMenu />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <AdminBanner />
          <main
            id="main-content"
            data-route={location.pathname}
            tabIndex={-1}
            className="app-content relative flex-1 overflow-y-auto outline-none"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

type ThemeMode = 'system' | 'light' | 'dark'

function AppearanceMenu() {
  const { t } = useTranslation('common')
  const theme = useSettingsStore((s) => s.settings.theme)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const options: { id: ThemeMode; label: string; description: string; icon: typeof Sun }[] =
    useMemo(
      () => [
        {
          id: 'system',
          label: t('themeSystem', 'System'),
          description: t('themeSystemDesc', 'Follow your computer'),
          icon: Monitor
        },
        {
          id: 'light',
          label: t('themeLight', 'Light'),
          description: t('themeLightDesc', 'Warm daylight'),
          icon: Sun
        },
        {
          id: 'dark',
          label: t('themeDark', 'Dark'),
          description: t('themeDarkDesc', 'Low-light comfort'),
          icon: Moon
        }
      ],
      [t]
    )
  const active = options.find((option) => option.id === theme) ?? options[0]
  const ActiveIcon = active.icon

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])

  const selectTheme = (nextTheme: ThemeMode) => {
    updateSettings({ theme: nextTheme })
    window.fabric?.settingsSet?.({ theme: nextTheme }).catch(() => {})
    setOpen(false)
  }

  const appearanceLabel = t('themeAppearance', 'Appearance')
  const appearanceTitle = t('themeAppearanceTitle', {
    theme: active.label,
    defaultValue: `Appearance: ${active.label}`
  })

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="titlebar-icon-button"
        aria-label={appearanceTitle}
        aria-expanded={open}
        aria-haspopup="menu"
        title={appearanceTitle}
        onClick={() => setOpen((value) => !value)}
      >
        <ActiveIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
      </button>
      {open && (
        <div className="appearance-menu animate-scale-in" role="menu" aria-label={appearanceLabel}>
          <div
            className="px-3 pb-2 pt-2.5 text-[9px] font-bold uppercase tracking-[0.16em]"
            style={{ color: 'var(--text-dim)' }}
          >
            {appearanceLabel}
          </div>
          {options.map((option) => {
            const Icon = option.icon
            const selected = option.id === theme
            return (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => selectTheme(option.id)}
              >
                <span className="appearance-option-icon">
                  <Icon className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <b>{option.label}</b>
                  <small>{option.description}</small>
                </span>
                {selected && (
                  <Check
                    className="h-3.5 w-3.5"
                    style={{ color: 'var(--brand-solid)' }}
                    strokeWidth={2.4}
                  />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
