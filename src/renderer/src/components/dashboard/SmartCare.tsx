import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowRight, Check, Trash2 } from 'lucide-react'
import type { CleanResult, DriveInfo, ScanResult } from '@shared/types'
import { CleanerType } from '@shared/enums'
import { CyberCore, ModuleArt, NavGlyph } from '@/components/brand/GlassArt'
import { OrbitButton } from '@/components/shared/ModuleStage'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useCleanAppPrompt } from '@/hooks/useCleanAppPrompt'
import { cleanInBatches } from '@/lib/cleaner-batches'
import { formatBytes } from '@/lib/utils'
import type { StageModule } from '@/components/layout/modules'
import { useScanStore } from '@/stores/scan-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useHistoryStore } from '@/stores/history-store'
import { useStatsStore } from '@/stores/stats-store'
import { useStartupStore } from '@/stores/startup-store'
import { useUpdaterStore } from '@/stores/updater-store'
import { useMalwareStore } from '@/stores/malware-store'
import './smart-care.css'

type Phase = 'idle' | 'scanning' | 'results' | 'cleaning'

interface JunkBatch {
  type: CleanerType
  ids: string[]
  clean: (ids: string[]) => Promise<CleanResult>
}

interface Findings {
  junk: { bytes: number; items: number; batches: JunkBatch[] }
  protection: {
    engineReady: boolean
    rules: number
    lastScanAt: string | null
    activeThreats: number
    privacyIssues: number | null
  }
  performance: { highImpact: number; enabled: number } | null
  applications: { updates: number | null }
  storage: { drive: DriveInfo | null }
}

/** Read-only scanners that feed the System Junk tile. Nothing here deletes. */
const JUNK_SCANNERS: {
  type: CleanerType
  scan: () => Promise<ScanResult[]>
  clean: (ids: string[]) => Promise<CleanResult>
}[] = [
  {
    type: CleanerType.System,
    scan: () => window.fabric.systemScan(),
    clean: (ids) => window.fabric.systemClean(ids)
  },
  {
    type: CleanerType.Browser,
    scan: () => window.fabric.browserScan(),
    clean: (ids) => window.fabric.browserClean(ids, true)
  },
  {
    type: CleanerType.App,
    scan: () => window.fabric.appScan(),
    clean: (ids) => window.fabric.appClean(ids)
  },
  {
    type: CleanerType.Gaming,
    scan: () => window.fabric.gamingScan(),
    clean: (ids) => window.fabric.gamingClean(ids)
  },
  {
    type: CleanerType.Environment,
    scan: () => window.fabric.environmentScan(),
    clean: (ids) => window.fabric.environmentClean(ids)
  },
  {
    type: CleanerType.Database,
    scan: () => window.fabric.databaseScan(),
    clean: (ids) => window.fabric.databaseClean(ids)
  }
]

const STEPS = ['junk', 'protection', 'performance', 'applications', 'storage'] as const
type Step = (typeof STEPS)[number]

const STEP_MODULE: Record<Step, StageModule> = {
  junk: 'cleanup',
  protection: 'protection',
  performance: 'performance',
  applications: 'applications',
  storage: 'spacelens'
}

export function SmartCare({ onBusyChange }: { onBusyChange?: (busy: boolean) => void }) {
  const { t } = useTranslation('experience')
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('idle')
  const [step, setStep] = useState<Step | null>(null)
  const [done, setDone] = useState<Set<Step>>(new Set())
  const [findings, setFindings] = useState<Findings | null>(null)
  const [cleaned, setCleaned] = useState<{ bytes: number; files: number } | null>(null)
  const [confirmClean, setConfirmClean] = useState(false)
  const [confirmTrash, setConfirmTrash] = useState(false)
  const [emptyingTrash, setEmptyingTrash] = useState(false)
  const cancelled = useRef(false)
  const excluded = useScanStore((s) => s.excludedSubcategories)
  const protectRecycleBin = useSettingsStore((s) => s.settings.cleaner.protectRecycleBin)
  const updaterRemindersEnabled = useSettingsStore(
    (s) => s.settings.softwareUpdaterNotifications ?? true
  )
  const addHistory = useHistoryStore((s) => s.addEntry)
  const recomputeStats = useStatsStore((s) => s.recompute)
  const { prepareApps, appCloseDialog } = useCleanAppPrompt()

  useEffect(() => {
    cancelled.current = false
    return () => {
      cancelled.current = true
    }
  }, [])

  useEffect(() => {
    onBusyChange?.(phase === 'scanning' || phase === 'cleaning' || emptyingTrash)
  }, [phase, emptyingTrash, onBusyChange])
  useEffect(() => () => onBusyChange?.(false), [onBusyChange])

  const scanJunk = useCallback(async (): Promise<Findings['junk']> => {
    const batches: JunkBatch[] = []
    let bytes = 0
    let items = 0
    for (const scanner of JUNK_SCANNERS) {
      try {
        const results = await scanner.scan()
        const kept = results.filter((r) => !excluded.has(r.subcategory))
        const ids = kept.flatMap((r) => r.items.map((i) => i.id))
        bytes += kept.reduce((sum, r) => sum + (r.totalSize || 0), 0)
        items += ids.length
        if (ids.length) batches.push({ type: scanner.type, ids, clean: scanner.clean })
      } catch {
        // One cleaner failing must not hide the others' findings.
      }
    }
    return { bytes, items, batches }
  }, [excluded])

  const scanProtection = useCallback(async (): Promise<Findings['protection']> => {
    const malware = useMalwareStore.getState()
    let engineReady = false
    let rules = 0
    try {
      const info = await window.fabric.malwareYaraInfo()
      engineReady = Boolean(info?.available)
      rules = info?.rulesLoaded ?? 0
    } catch {
      engineReady = false
    }
    let privacyIssues: number | null = null
    try {
      const privacy = await window.fabric.privacyScan()
      privacyIssues = Math.max(0, privacy.total - privacy.protected)
    } catch {
      privacyIssues = null
    }
    return {
      engineReady,
      rules,
      lastScanAt: malware.lastCompletedScan?.completedAt ?? null,
      activeThreats:
        (malware.lastCompletedScan?.unresolvedThreats ?? 0) + malware.knownActiveThreats,
      privacyIssues
    }
  }, [])

  const scanPerformance = useCallback(async (): Promise<Findings['performance']> => {
    try {
      const items = await window.fabric.startupList()
      useStartupStore.getState().setItems(items)
      const enabled = items.filter((i) => i.enabled)
      return {
        highImpact: enabled.filter((i) => i.impact === 'high').length,
        enabled: enabled.length
      }
    } catch {
      return null
    }
  }, [])

  const scanApplications = useCallback(async (): Promise<Findings['applications']> => {
    if (!updaterRemindersEnabled) return { updates: null }
    const updater = useUpdaterStore.getState()
    if (updater.hasChecked) return { updates: updater.apps.length }
    try {
      const result = await window.fabric.softwareUpdateCheck()
      updater.setApps(result.apps)
      updater.setUpToDate(result.upToDate)
      updater.setPackageManagerAvailable(result.packageManagerAvailable)
      updater.setPackageManagerName(result.packageManagerName)
      updater.setManagers(result.managers)
      updater.setHasChecked(true)
      return { updates: result.apps.length }
    } catch {
      return { updates: null }
    }
  }, [updaterRemindersEnabled])

  const scanStorage = useCallback(async (): Promise<Findings['storage']> => {
    try {
      const drives = await window.fabric.diskDrives()
      return { drive: drives.find((d) => d.isSystem) ?? drives[0] ?? null }
    } catch {
      return { drive: null }
    }
  }, [])

  const runScan = useCallback(async () => {
    if (phase === 'scanning' || phase === 'cleaning') return
    setPhase('scanning')
    setFindings(null)
    setCleaned(null)
    setDone(new Set())
    const mark = (s: Step) => setDone((prev) => new Set(prev).add(s))

    setStep('junk')
    const junk = await scanJunk()
    mark('junk')
    if (cancelled.current) return
    setStep('protection')
    const protection = await scanProtection()
    mark('protection')
    if (cancelled.current) return
    setStep('performance')
    const performance = await scanPerformance()
    mark('performance')
    if (cancelled.current) return
    setStep('applications')
    const applications = await scanApplications()
    mark('applications')
    if (cancelled.current) return
    setStep('storage')
    const storage = await scanStorage()
    mark('storage')
    if (cancelled.current) return

    setFindings({ junk, protection, performance, applications, storage })
    setStep(null)
    setPhase('results')
  }, [phase, scanJunk, scanProtection, scanPerformance, scanApplications, scanStorage])

  const runClean = useCallback(async () => {
    setConfirmClean(false)
    if (!findings || findings.junk.batches.length === 0) return
    const started = Date.now()
    setPhase('cleaning')
    const ids = findings.junk.batches.flatMap((b) => b.ids)
    if (!(await prepareApps(ids))) {
      setPhase('results')
      return
    }
    let bytes = 0
    let files = 0
    for (const batch of findings.junk.batches) {
      try {
        const cleanedBatch = await cleanInBatches(batch.ids, batch.clean)
        bytes += cleanedBatch.result.totalCleaned || 0
        files += cleanedBatch.result.filesDeleted || 0
        if (cleanedBatch.error) toast.error(t('smartCare.cleanPartial'))
      } catch {
        toast.error(t('smartCare.cleanPartial'))
      }
    }
    if (cancelled.current) return
    if (files > 0) {
      await addHistory({
        id: Date.now().toString(),
        type: 'cleaner',
        timestamp: new Date().toISOString(),
        duration: Date.now() - started,
        totalItemsFound: findings.junk.items,
        totalItemsCleaned: files,
        totalItemsSkipped: Math.max(0, findings.junk.items - files),
        totalSpaceSaved: bytes,
        categories: [
          {
            name: 'Smart Care',
            itemsFound: findings.junk.items,
            itemsCleaned: files,
            spaceSaved: bytes
          }
        ],
        errorCount: 0
      })
      recomputeStats()
    }
    setCleaned({ bytes, files })
    setFindings(null)
    setPhase('idle')
  }, [findings, prepareApps, addHistory, recomputeStats, t])

  const emptyTrash = useCallback(async () => {
    setConfirmTrash(false)
    setEmptyingTrash(true)
    try {
      const result = await window.fabric.recycleBinClean()
      toast.success(t('smartCare.trashEmptied', { size: formatBytes(result.totalCleaned || 0, 1) }))
    } catch {
      toast.error(t('smartCare.trashFailed'))
    } finally {
      if (!cancelled.current) setEmptyingTrash(false)
    }
  }, [t])

  const busy = phase === 'scanning' || phase === 'cleaning'
  const showResults = phase === 'results' || (phase === 'cleaning' && findings)

  return (
    <div className="smart-care" data-phase={phase}>
      {!showResults && (
        <section className="smart-care-hero" aria-live="polite">
          <div className="smart-care-core">
            <CyberCore size={380} scanning={phase === 'scanning'} />
            {phase === 'scanning' && (
              <ol className="smart-care-orbit-steps" aria-label={t('smartCare.progressLabel')}>
                {STEPS.map((s, index) => (
                  <li
                    key={s}
                    data-state={done.has(s) ? 'done' : step === s ? 'active' : 'pending'}
                    style={{ ['--i' as string]: index }}
                  >
                    <span className="smart-care-step-badge" data-module={STEP_MODULE[s]}>
                      {done.has(s) ? (
                        <Check size={14} strokeWidth={2.6} />
                      ) : (
                        <NavGlyph module={STEP_MODULE[s]} />
                      )}
                    </span>
                    <span className="sr-only">{t(`smartCare.tiles.${s}.title`)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          {phase === 'scanning' && step ? (
            <>
              <span className="fc-stage-eyebrow">{t('smartCare.scanningEyebrow')}</span>
              <h1>{t(`smartCare.steps.${step}`)}</h1>
              <p>{t('smartCare.scanningDescription', { done: done.size, total: STEPS.length })}</p>
            </>
          ) : cleaned ? (
            <>
              <span className="fc-stage-eyebrow">{t('smartCare.doneEyebrow')}</span>
              <h1>{t('smartCare.doneTitle', { size: formatBytes(cleaned.bytes, 1) })}</h1>
              <p>{t('smartCare.doneDescription', { count: cleaned.files })}</p>
            </>
          ) : (
            <>
              <span className="fc-stage-eyebrow">{t('smartCare.eyebrow')}</span>
              <h1>{t('smartCare.title')}</h1>
              <p>{t('smartCare.description')}</p>
            </>
          )}
        </section>
      )}

      {showResults && findings && (
        <section className="smart-care-results" aria-labelledby="smart-care-results-title">
          <header className="smart-care-results-heading">
            <span className="fc-stage-eyebrow">{t('smartCare.resultsEyebrow')}</span>
            <h1 id="smart-care-results-title">{t('smartCare.resultsTitle')}</h1>
          </header>
          <div className="smart-care-bento">
            <BentoTile
              step="junk"
              value={formatBytes(findings.junk.bytes, 1)}
              detail={t('smartCare.tiles.junk.detail', { count: findings.junk.items })}
              status={findings.junk.items > 0 ? 'attention' : 'good'}
              linkLabel={t('smartCare.reviewDetails')}
              onOpen={() => navigate('/cleaner')}
              featured
            />
            <BentoTile
              step="protection"
              value={
                findings.protection.activeThreats > 0
                  ? t('smartCare.tiles.protection.threats', {
                      count: findings.protection.activeThreats
                    })
                  : findings.protection.engineReady
                    ? t('smartCare.tiles.protection.ready')
                    : t('smartCare.tiles.protection.preparing')
              }
              detail={
                findings.protection.privacyIssues == null
                  ? t('smartCare.tiles.protection.privacyUnknown')
                  : t('smartCare.tiles.protection.privacy', {
                      count: findings.protection.privacyIssues
                    })
              }
              status={
                findings.protection.activeThreats > 0
                  ? 'alert'
                  : (findings.protection.privacyIssues ?? 0) > 0
                    ? 'attention'
                    : 'good'
              }
              linkLabel={t('smartCare.reviewDetails')}
              onOpen={() => navigate('/malware')}
            />
            <BentoTile
              step="performance"
              value={
                findings.performance
                  ? t('smartCare.tiles.performance.value', {
                      count: findings.performance.highImpact
                    })
                  : t('smartCare.unavailable')
              }
              detail={
                findings.performance
                  ? t('smartCare.tiles.performance.detail', {
                      count: findings.performance.enabled
                    })
                  : ''
              }
              status={(findings.performance?.highImpact ?? 0) > 0 ? 'attention' : 'good'}
              linkLabel={t('smartCare.reviewDetails')}
              onOpen={() => navigate('/startup')}
            />
            <BentoTile
              step="applications"
              value={
                findings.applications.updates == null
                  ? t('smartCare.unavailable')
                  : t('smartCare.tiles.applications.value', {
                      count: findings.applications.updates
                    })
              }
              detail={t('smartCare.tiles.applications.detail')}
              status={(findings.applications.updates ?? 0) > 0 ? 'attention' : 'good'}
              linkLabel={t('smartCare.reviewDetails')}
              onOpen={() => navigate('/updates')}
            />
            <BentoTile
              step="storage"
              value={
                findings.storage.drive
                  ? t('smartCare.tiles.storage.value', {
                      free: formatBytes(findings.storage.drive.freeSpace, 0)
                    })
                  : t('smartCare.unavailable')
              }
              detail={
                findings.storage.drive
                  ? t('smartCare.tiles.storage.detail', {
                      drive: findings.storage.drive.label || findings.storage.drive.letter,
                      total: formatBytes(findings.storage.drive.totalSize, 0)
                    })
                  : ''
              }
              meter={
                findings.storage.drive
                  ? findings.storage.drive.usedSpace / Math.max(1, findings.storage.drive.totalSize)
                  : undefined
              }
              status={
                findings.storage.drive &&
                findings.storage.drive.usedSpace / Math.max(1, findings.storage.drive.totalSize) >
                  0.85
                  ? 'attention'
                  : 'good'
              }
              linkLabel={t('smartCare.tiles.storage.link')}
              onOpen={() => navigate('/large-files')}
            />
          </div>
        </section>
      )}

      <div className="smart-care-dock">
        {showResults && findings ? (
          <>
            <OrbitButton
              label={t('smartCare.clean')}
              onClick={() => setConfirmClean(true)}
              disabled={busy || findings.junk.batches.length === 0}
              busy={phase === 'cleaning'}
              describedBy="smart-care-clean-hint"
            />
            <div className="smart-care-dock-side">
              <span id="smart-care-clean-hint">
                {findings.junk.batches.length === 0
                  ? t('smartCare.nothingToClean')
                  : t('smartCare.cleanHint', { size: formatBytes(findings.junk.bytes, 1) })}
              </span>
              <div className="smart-care-dock-actions">
                <button
                  type="button"
                  className="fc-glass-button"
                  onClick={() => setConfirmTrash(true)}
                  disabled={busy || emptyingTrash || protectRecycleBin}
                  title={protectRecycleBin ? t('smartCare.trashProtected') : undefined}
                >
                  <Trash2 size={15} strokeWidth={1.8} />
                  {t('smartCare.emptyTrash')}
                </button>
                <button
                  type="button"
                  className="fc-glass-button is-quiet"
                  onClick={() => void runScan()}
                  disabled={busy}
                >
                  {t('smartCare.rescan')}
                </button>
              </div>
            </div>
          </>
        ) : (
          <OrbitButton
            label={phase === 'scanning' ? t('smartCare.scanning') : t('smartCare.scan')}
            onClick={() => void runScan()}
            disabled={busy}
            busy={phase === 'scanning'}
          />
        )}
      </div>

      <ConfirmDialog
        open={confirmClean}
        title={t('smartCare.confirmCleanTitle')}
        description={t('smartCare.confirmCleanDescription', {
          size: formatBytes(findings?.junk.bytes ?? 0, 1),
          count: findings?.junk.items ?? 0
        })}
        confirmLabel={t('smartCare.clean')}
        onConfirm={() => void runClean()}
        onCancel={() => setConfirmClean(false)}
      />
      <ConfirmDialog
        open={confirmTrash}
        variant="danger"
        title={t('smartCare.confirmTrashTitle')}
        description={t('smartCare.confirmTrashDescription')}
        confirmLabel={t('smartCare.emptyTrash')}
        onConfirm={() => void emptyTrash()}
        onCancel={() => setConfirmTrash(false)}
      />
      {appCloseDialog}
    </div>
  )
}

function BentoTile({
  step,
  value,
  detail,
  status,
  linkLabel,
  onOpen,
  featured,
  meter
}: {
  step: Step
  value: string
  detail: string
  status: 'good' | 'attention' | 'alert'
  linkLabel: string
  onOpen: () => void
  featured?: boolean
  meter?: number
}) {
  const { t } = useTranslation('experience')
  return (
    <article
      className={`smart-care-tile${featured ? ' is-featured' : ''}`}
      data-module={STEP_MODULE[step]}
      data-status={status}
    >
      {featured && (
        <span className="smart-care-tile-art" aria-hidden="true">
          <ModuleArt module={STEP_MODULE[step]} size={230} />
        </span>
      )}
      <div className="smart-care-tile-top">
        <span className="smart-care-tile-badge" aria-hidden="true">
          <NavGlyph module={STEP_MODULE[step]} />
        </span>
        <span className="smart-care-tile-pill">{t(`smartCare.status.${status}`)}</span>
      </div>
      <h2>{t(`smartCare.tiles.${step}.title`)}</h2>
      <strong className="smart-care-tile-value">{value}</strong>
      {detail && <p>{detail}</p>}
      {meter != null && (
        <div
          className="smart-care-meter"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(meter * 100)}
          aria-label={t('smartCare.tiles.storage.meter')}
        >
          <span style={{ width: `${Math.min(100, Math.round(meter * 100))}%` }} />
        </div>
      )}
      <button type="button" className="smart-care-tile-link" onClick={onOpen}>
        {linkLabel}
        <ArrowRight size={14} strokeWidth={2} />
      </button>
    </article>
  )
}
