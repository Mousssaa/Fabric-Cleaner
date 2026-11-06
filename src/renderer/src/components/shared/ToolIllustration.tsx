import { useLocation } from 'react-router-dom'
import { ModuleArt } from '@/components/brand/GlassArt'
import { moduleForPath } from '@/components/layout/modules'
import { pageExperiences } from '@/components/layout/page-experiences'

/** Decorative, code-native artwork. It never represents file counts, scan findings, or telemetry. */
export function ToolIllustration() {
  const { pathname } = useLocation()
  const experience = pageExperiences[pathname]
  return (
    <div
      className="pulse-tool-art is-glass"
      data-family={experience?.family}
      data-tool={experience?.key}
      aria-hidden="true"
    >
      <ModuleArt module={moduleForPath(pathname)} size={170} />
    </div>
  )
}
