import type { LucideIcon } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ModuleArt } from '@/components/brand/GlassArt'
import { moduleForPath, type StageModule } from '@/components/layout/modules'

/**
 * The circular floating action button that anchors every stage.
 * 88px core, glass halo and an orbital ring. The label is always visible
 * text, so it reads the same to screen readers and in every language.
 */
export function OrbitButton({
  label,
  onClick,
  disabled,
  busy,
  variant = 'primary',
  className,
  describedBy
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  busy?: boolean
  variant?: 'primary' | 'danger'
  className?: string
  describedBy?: string
}) {
  return (
    <button
      type="button"
      className={cn('fc-orbit-button', busy && 'is-busy', className)}
      data-variant={variant}
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy || undefined}
      aria-describedby={describedBy}
    >
      <span className="fc-orbit-ring" aria-hidden="true" />
      <span className="fc-orbit-core">{label}</span>
    </button>
  )
}

export interface StageFeature {
  icon: LucideIcon
  title: string
  description: string
}

/**
 * Landing stage used by modules before they have results: title and a short
 * list of what the module does on one side, a glass illustration on the
 * other, and the circular action button centred underneath.
 */
export function ModuleStage({
  eyebrow,
  title,
  description,
  features,
  action,
  footnote,
  module,
  className
}: {
  eyebrow?: string
  title: string
  description: string
  features: StageFeature[]
  action?: {
    label: string
    onClick: () => void
    disabled?: boolean
    busy?: boolean
  }
  footnote?: React.ReactNode
  module?: StageModule
  className?: string
}) {
  const { pathname } = useLocation()
  const stageModule = module ?? moduleForPath(pathname)
  return (
    <section className={cn('fc-module-stage', className)} data-module={stageModule}>
      <div className="fc-module-stage-copy">
        {eyebrow && <span className="fc-stage-eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        <p>{description}</p>
        <ul className="fc-stage-features">
          {features.map(({ icon: Icon, title: featureTitle, description: featureDescription }) => (
            <li key={featureTitle}>
              <span className="fc-stage-feature-icon" aria-hidden="true">
                <Icon size={17} strokeWidth={1.8} />
              </span>
              <span>
                <strong>{featureTitle}</strong>
                <small>{featureDescription}</small>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="fc-module-stage-art">
        <ModuleArt module={stageModule} size={300} />
      </div>
      {(action || footnote) && (
        <div className="fc-module-stage-action">
          {action && (
            <OrbitButton
              label={action.label}
              onClick={action.onClick}
              disabled={action.disabled}
              busy={action.busy}
            />
          )}
          {footnote && <div className="fc-stage-footnote">{footnote}</div>}
        </div>
      )}
    </section>
  )
}
