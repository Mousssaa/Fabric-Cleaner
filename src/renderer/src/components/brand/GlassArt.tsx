import { useId } from 'react'
import { modulePalette, type StageModule } from '@/components/layout/modules'

/*
 * Code-native glass illustrations for Fabric Cleaner (HakTrak Networks).
 *
 * Everything here is drawn from primitives in this file: an isometric hex
 * prism (the Fabric "core"), orbital rings, and one glass object per module.
 * The art is decorative only. It never shows scan findings or telemetry.
 */

const HEX = {
  top: '200,108 279.7,154 200,200 120.3,154',
  right: '279.7,154 279.7,246 200,292 200,200',
  left: '120.3,154 200,200 200,292 120.3,246',
  outline: '200,108 279.7,154 279.7,246 200,292 120.3,246 120.3,154'
}

const PARTICLES: [number, number, number, number][] = [
  [62, 96, 2.2, 0],
  [338, 82, 1.6, 1.2],
  [356, 236, 2.4, 0.6],
  [44, 262, 1.8, 2.1],
  [118, 52, 1.4, 1.6],
  [292, 338, 1.8, 0.3],
  [96, 330, 1.3, 2.6],
  [312, 150, 1.2, 1.9],
  [26, 176, 1.5, 0.9],
  [372, 312, 1.3, 2.3]
]

function ellipsePath(cx: number, cy: number, rx: number, ry: number) {
  return `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${rx * 2},0 a${rx},${ry} 0 1,0 ${-rx * 2},0`
}

/** The Smart Care hero: a glowing hex prism inside two orbital glass rings. */
export function CyberCore({
  size = 320,
  scanning = false,
  module = 'smartcare'
}: {
  size?: number
  scanning?: boolean
  module?: StageModule
}) {
  const uid = useId().replace(/:/g, '')
  const p = modulePalette[module]
  const id = (name: string) => `${uid}-${name}`
  const ringA = ellipsePath(200, 200, 176, 50)
  const ringB = ellipsePath(200, 200, 150, 40)
  return (
    <svg
      className={`fc-core ${scanning ? 'is-scanning' : ''}`}
      viewBox="0 0 400 400"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={id('halo')} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={p.a} stopOpacity=".42" />
          <stop offset=".45" stopColor={p.b} stopOpacity=".14" />
          <stop offset="1" stopColor={p.b} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('top')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".92" />
          <stop offset=".35" stopColor={p.a} stopOpacity=".85" />
          <stop offset="1" stopColor={p.b} stopOpacity=".6" />
        </linearGradient>
        <linearGradient id={id('right')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.b} stopOpacity=".9" />
          <stop offset="1" stopColor="#0047AB" stopOpacity=".72" />
        </linearGradient>
        <linearGradient id={id('left')} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a3a5c" stopOpacity=".95" />
          <stop offset="1" stopColor={p.deep} stopOpacity=".98" />
        </linearGradient>
        <radialGradient id={id('heart')} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".35" stopColor={p.a} />
          <stop offset="1" stopColor={p.a} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('ring')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={p.a} stopOpacity="0" />
          <stop offset=".5" stopColor={p.a} stopOpacity=".95" />
          <stop offset="1" stopColor={p.b} stopOpacity=".1" />
        </linearGradient>
        <linearGradient id={id('spec')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".95" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={id('blur')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id={id('soft')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      <circle cx="200" cy="200" r="196" fill={`url(#${id('halo')})`} className="fc-core-halo" />

      {/* back halves of the orbital rings */}
      <g transform="rotate(-16 200 200)" opacity=".6">
        <path d={ringA} fill="none" stroke={`url(#${id('ring')})`} strokeWidth="1.4" />
      </g>
      <g transform="rotate(22 200 200)" opacity=".45">
        <path d={ringB} fill="none" stroke={`url(#${id('ring')})`} strokeWidth="1.1" />
      </g>

      {/* the prism */}
      <g className="fc-core-prism">
        <polygon points={HEX.outline} fill={p.a} opacity=".35" filter={`url(#${id('blur')})`} />
        <polygon points={HEX.left} fill={`url(#${id('left')})`} />
        <polygon points={HEX.right} fill={`url(#${id('right')})`} />
        <polygon points={HEX.top} fill={`url(#${id('top')})`} />
        {/* woven threads across the faces: the "fabric" in Fabric Cleaner */}
        <g fill="none" strokeLinecap="round" opacity=".55">
          <path d="M140 165 L200 200 L200 270" stroke="#fff" strokeWidth="2" strokeOpacity=".35" />
          <path d="M260 165 L200 200" stroke="#fff" strokeWidth="2" strokeOpacity=".35" />
          <path d="M160 142 L240 188" stroke={p.deep} strokeWidth="3" strokeOpacity=".35" />
          <path d="M240 142 L160 188" stroke="#fff" strokeWidth="1.5" strokeOpacity=".4" />
          <path d="M218 214 L262 188 L262 234" stroke="#fff" strokeWidth="1.5" strokeOpacity=".3" />
          <path d="M138 188 L182 214 L182 260" stroke={p.a} strokeWidth="1.5" strokeOpacity=".5" />
        </g>
        <polygon
          points={HEX.outline}
          fill="none"
          stroke="#ffffff"
          strokeOpacity=".5"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <polyline
          points="120.3,154 200,108 279.7,154"
          fill="none"
          stroke={`url(#${id('spec')})`}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="200" cy="200" r="34" fill={`url(#${id('heart')})`} className="fc-core-heart" />
        <path
          d="M268 120l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"
          fill="#fff"
          className="fc-core-glint"
          filter={`url(#${id('soft')})`}
        />
        <path d="M268 120l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#fff" />
      </g>

      {/* front halves of the rings, drawn over the prism */}
      <g transform="rotate(-16 200 200)">
        <path
          d="M24,200 a176,50 0 0,0 352,0"
          fill="none"
          stroke={`url(#${id('ring')})`}
          strokeWidth="2"
          className="fc-core-ring"
        />
        <circle r="4.5" fill="#fff" className="fc-core-node">
          <animateMotion dur={scanning ? '2.6s' : '9s'} repeatCount="indefinite" path={ringA} />
        </circle>
      </g>
      <g transform="rotate(22 200 200)">
        <path
          d="M50,200 a150,40 0 0,0 300,0"
          fill="none"
          stroke={`url(#${id('ring')})`}
          strokeWidth="1.5"
          opacity=".8"
        />
        <circle r="3" fill={p.a} className="fc-core-node">
          <animateMotion dur={scanning ? '2s' : '7s'} repeatCount="indefinite" path={ringB} />
        </circle>
      </g>

      <g className="fc-core-particles">
        {PARTICLES.map(([x, y, r, delay]) => (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r={r}
            fill={r > 2 ? p.a : '#fff'}
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </g>
    </svg>
  )
}

/** One glass object per module, on a soft plinth, for landing stages. */
export function ModuleArt({ module, size = 300 }: { module: StageModule; size?: number }) {
  if (module === 'smartcare') return <CyberCore size={size} />
  return (
    <svg
      className="fc-module-art"
      data-module={module}
      viewBox="0 0 320 320"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <ArtBody module={module} />
    </svg>
  )
}

function ArtBody({ module }: { module: Exclude<StageModule, 'smartcare'> }) {
  const uid = useId().replace(/:/g, '')
  const p = modulePalette[module]
  const id = (name: string) => `${uid}-${name}`
  const url = (name: string) => `url(#${id(name)})`
  return (
    <>
      <defs>
        <radialGradient id={id('halo')} cx="50%" cy="46%" r="50%">
          <stop offset="0" stopColor={p.a} stopOpacity=".38" />
          <stop offset=".55" stopColor={p.b} stopOpacity=".1" />
          <stop offset="1" stopColor={p.b} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('glass')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".85" />
          <stop offset=".3" stopColor={p.a} stopOpacity=".8" />
          <stop offset="1" stopColor={p.b} stopOpacity=".55" />
        </linearGradient>
        <linearGradient id={id('deep')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.b} stopOpacity=".85" />
          <stop offset="1" stopColor={p.deep} stopOpacity=".95" />
        </linearGradient>
        <linearGradient id={id('edge')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('ring')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={p.a} stopOpacity="0" />
          <stop offset=".5" stopColor={p.a} stopOpacity=".9" />
          <stop offset="1" stopColor={p.b} stopOpacity=".1" />
        </linearGradient>
        <filter id={id('blur')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>
      <circle cx="160" cy="150" r="158" fill={url('halo')} className="fc-core-halo" />
      <ellipse cx="160" cy="272" rx="92" ry="16" fill={p.a} opacity=".18" filter={url('blur')} />
      <ellipse
        cx="160"
        cy="272"
        rx="84"
        ry="12"
        fill="none"
        stroke={url('ring')}
        strokeWidth="1.4"
      />
      <g className="fc-art-float">
        {module === 'cleanup' && <CleanupObject url={url} p={p} />}
        {module === 'protection' && <ProtectionObject url={url} p={p} />}
        {module === 'performance' && <PerformanceObject url={url} p={p} />}
        {module === 'applications' && <ApplicationsObject url={url} p={p} />}
        {module === 'spacelens' && <SpaceLensObject url={url} p={p} />}
        {module === 'activity' && <ActivityObject url={url} p={p} />}
        {module === 'preferences' && <PreferencesObject url={url} p={p} />}
      </g>
      <g transform="rotate(-14 160 150)" opacity=".75">
        <path d="M28,150 a132,34 0 0,0 264,0" fill="none" stroke={url('ring')} strokeWidth="1.6" />
      </g>
      <g className="fc-core-particles">
        {PARTICLES.slice(0, 7).map(([x, y, r, delay]) => (
          <circle
            key={`${x}-${y}`}
            cx={x * 0.8}
            cy={y * 0.8}
            r={r}
            fill={r > 2 ? p.a : '#fff'}
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </g>
    </>
  )
}

type ObjectProps = {
  url: (name: string) => string
  p: { a: string; b: string; deep: string }
}

function Spark({
  x,
  y,
  s = 1,
  fill = '#fff'
}: {
  x: number
  y: number
  s?: number
  fill?: string
}) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0-10 2.6-2.6 10 0 2.6 2.6 0 10-2.6 2.6-10 0-2.6-2.6z"
      fill={fill}
    />
  )
}

/** Cleanup: a glass cube with a stream of sparks lifting dust away. */
function CleanupObject({ url, p }: ObjectProps) {
  return (
    <>
      <polygon points="160,96 222,132 160,168 98,132" fill={url('glass')} />
      <polygon points="222,132 222,204 160,240 160,168" fill={url('deep')} opacity=".95" />
      <polygon points="98,132 160,168 160,240 98,204" fill={p.deep} opacity=".92" />
      <polygon
        points="160,96 222,132 222,204 160,240 98,204 98,132"
        fill="none"
        stroke="#fff"
        strokeOpacity=".45"
        strokeWidth="1.2"
      />
      <polyline points="98,132 160,96 222,132" fill="none" stroke={url('edge')} strokeWidth="2.2" />
      <path
        d="M118 110 C 150 60, 210 52, 250 70"
        fill="none"
        stroke={p.a}
        strokeOpacity=".6"
        strokeWidth="1.5"
        strokeDasharray="2 6"
        strokeLinecap="round"
      />
      <Spark x={252} y={70} s={1.2} />
      <Spark x={214} y={56} s={0.7} fill={p.a} />
      <Spark x={178} y={64} s={0.5} />
      <circle cx="132" cy="190" r="3" fill="#fff" opacity=".35" />
      <circle cx="190" cy="200" r="2" fill={p.a} opacity=".6" />
    </>
  )
}

/** Protection: a faceted hex shield with a concentric hex aura. */
function ProtectionObject({ url, p }: ObjectProps) {
  return (
    <>
      <polygon
        points="160,46 246,96 246,196 160,246 74,196 74,96"
        fill="none"
        stroke={p.a}
        strokeOpacity=".22"
        strokeWidth="1.2"
      />
      <path d="M160 72 L222 98 V160 C222 200 196 226 160 244 Z" fill={url('deep')} />
      <path d="M160 72 L98 98 V160 C98 200 124 226 160 244 Z" fill={url('glass')} />
      <path
        d="M160 72 L222 98 V160 C222 200 196 226 160 244 C124 226 98 200 98 160 V98 Z"
        fill="none"
        stroke="#fff"
        strokeOpacity=".55"
        strokeWidth="1.4"
      />
      <path d="M104 100 L160 76 L216 100" fill="none" stroke={url('edge')} strokeWidth="2.2" />
      <path
        d="M134 158 L152 176 L190 136"
        fill="none"
        stroke="#fff"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M134 158 L152 176 L190 136"
        fill="none"
        stroke={p.a}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  )
}

/** Performance: a glass dial with a sweeping needle and speed chevrons. */
function PerformanceObject({ url, p }: ObjectProps) {
  return (
    <>
      <circle cx="160" cy="160" r="84" fill={url('deep')} />
      <circle cx="160" cy="160" r="84" fill="none" stroke="#fff" strokeOpacity=".4" />
      <path
        d="M96 196 A72 72 0 1 1 224 196"
        fill="none"
        stroke={p.deep}
        strokeOpacity=".7"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M96 196 A72 72 0 0 1 206 104"
        fill="none"
        stroke={url('glass')}
        strokeWidth="12"
        strokeLinecap="round"
      />
      <g className="fc-art-needle">
        <path d="M160 160 L204 112" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      </g>
      <circle cx="160" cy="160" r="10" fill="#fff" />
      <circle cx="160" cy="160" r="5" fill={p.a} />
      <path d="M100 100 A84 84 0 0 1 220 100" fill="none" stroke={url('edge')} strokeWidth="2" />
      <g fill="none" stroke={p.b} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M232 210 l14 12 -14 12" opacity=".9" />
        <path d="M250 210 l14 12 -14 12" opacity=".55" />
        <path d="M268 210 l14 12 -14 12" opacity=".25" />
      </g>
    </>
  )
}

/** Applications: three floating glass tiles stacked in isometric space. */
function ApplicationsObject({ url, p }: ObjectProps) {
  const tile = (y: number, opacity: number, top: string) => (
    <g opacity={opacity}>
      <polygon
        points={`160,${y} 230,${y + 38} 160,${y + 76} 90,${y + 38}`}
        fill={top}
        stroke="#fff"
        strokeOpacity=".5"
      />
      <polygon
        points={`90,${y + 38} 160,${y + 76} 160,${y + 88} 90,${y + 50}`}
        fill={p.deep}
        opacity=".9"
      />
      <polygon
        points={`230,${y + 38} 160,${y + 76} 160,${y + 88} 230,${y + 50}`}
        fill={p.b}
        opacity=".7"
      />
    </g>
  )
  return (
    <>
      {tile(160, 0.55, url('deep'))}
      {tile(118, 0.8, url('deep'))}
      {tile(76, 1, url('glass'))}
      <polyline points="90,114 160,76 230,114" fill="none" stroke={url('edge')} strokeWidth="2" />
      <rect
        x="146"
        y="102"
        width="28"
        height="28"
        rx="8"
        transform="rotate(45 160 116) scale(1 1)"
        fill="#fff"
        opacity=".85"
      />
      <Spark x={240} y={78} s={0.9} />
    </>
  )
}

/** Space Lens: a segmented storage ring seen through a glass lens. */
function SpaceLensObject({ p }: ObjectProps) {
  const seg = (start: number, end: number, color: string, r = 82) => {
    const a0 = (start * Math.PI) / 180
    const a1 = (end * Math.PI) / 180
    const x0 = 160 + r * Math.cos(a0)
    const y0 = 160 + r * Math.sin(a0)
    const x1 = 160 + r * Math.cos(a1)
    const y1 = 160 + r * Math.sin(a1)
    const large = end - start > 180 ? 1 : 0
    return (
      <path
        d={`M${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1}`}
        fill="none"
        stroke={color}
        strokeWidth="22"
      />
    )
  }
  return (
    <>
      <circle cx="160" cy="160" r="98" fill={p.deep} opacity=".8" />
      {seg(-90, 40, p.a)}
      {seg(44, 150, p.b)}
      {seg(154, 214, '#FCD34D')}
      {seg(218, 266, '#67E8F9')}
      <circle cx="160" cy="160" r="98" fill="none" stroke="#fff" strokeOpacity=".35" />
      <circle
        cx="160"
        cy="160"
        r="54"
        fill="#ffffff"
        fillOpacity=".08"
        stroke="#fff"
        strokeOpacity=".6"
        strokeWidth="1.5"
      />
      <path
        d="M126 140 A40 40 0 0 1 170 116"
        fill="none"
        stroke="#fff"
        strokeOpacity=".9"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M200 200 L236 236"
        stroke="#fff"
        strokeOpacity=".75"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path d="M200 200 L236 236" stroke={p.a} strokeWidth="4" strokeLinecap="round" />
    </>
  )
}

/** Activity & Recovery: a timeline ring with a returning arrow. */
function ActivityObject({ url, p }: ObjectProps) {
  return (
    <>
      <circle cx="160" cy="160" r="80" fill={url('deep')} />
      <path
        d="M98 120 A74 74 0 1 1 92 186"
        fill="none"
        stroke={url('glass')}
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M84 104 L98 122 L118 108"
        fill="none"
        stroke="#fff"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M160 116 V162 L192 180"
        fill="none"
        stroke="#fff"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="160" cy="162" r="6" fill={p.a} />
      <circle cx="160" cy="160" r="80" fill="none" stroke="#fff" strokeOpacity=".35" />
    </>
  )
}

/** Preferences: a hex-nut dial. */
function PreferencesObject({ url, p }: ObjectProps) {
  return (
    <>
      <polygon points="160,74 234,117 234,203 160,246 86,203 86,117" fill={url('deep')} />
      <polygon points="160,74 234,117 160,160 86,117" fill={url('glass')} opacity=".9" />
      <polygon
        points="160,74 234,117 234,203 160,246 86,203 86,117"
        fill="none"
        stroke="#fff"
        strokeOpacity=".5"
      />
      <circle
        cx="160"
        cy="160"
        r="34"
        fill={p.deep}
        stroke="#fff"
        strokeOpacity=".7"
        strokeWidth="2"
      />
      <circle cx="160" cy="160" r="12" fill={p.a} />
    </>
  )
}

/** Small custom badge glyphs for the navigation dock (20×20 grid). */
export function NavGlyph({ module }: { module: StageModule }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const
  }
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
      {module === 'smartcare' && (
        <>
          <path {...common} d="M10 2.5 16.5 6.2v7.6L10 17.5 3.5 13.8V6.2z" />
          <path {...common} d="M3.5 6.2 10 10l6.5-3.8M10 10v7.5" />
        </>
      )}
      {module === 'cleanup' && (
        <>
          <path {...common} d="M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6z" />
          <path {...common} d="M15.5 13.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z" />
        </>
      )}
      {module === 'protection' && (
        <>
          <path {...common} d="M10 2.5 16 5v4.6c0 3.7-2.6 6.4-6 7.9-3.4-1.5-6-4.2-6-7.9V5z" />
          <path {...common} d="M7.2 10.2 9.2 12.2 13 8.3" />
        </>
      )}
      {module === 'performance' && (
        <>
          <path {...common} d="M3.3 14.5a7 7 0 1 1 13.4 0" />
          <path {...common} d="M10 12.5 13.4 7.6" />
          <circle cx="10" cy="12.6" r="1.2" fill="currentColor" />
        </>
      )}
      {module === 'applications' && (
        <>
          <rect {...common} x="3" y="3" width="5.6" height="5.6" rx="1.6" />
          <rect {...common} x="11.4" y="11.4" width="5.6" height="5.6" rx="1.6" />
          <rect {...common} x="3" y="11.4" width="5.6" height="5.6" rx="1.6" />
          <path {...common} d="M14.2 2.6 17.4 5.8 14.2 9 11 5.8z" />
        </>
      )}
      {module === 'spacelens' && (
        <>
          <path {...common} d="M10 3a7 7 0 1 1-7 7" />
          <path {...common} d="M3 10a7 7 0 0 1 7-7" strokeDasharray="2.2 2" />
          <circle {...common} cx="10" cy="10" r="2.6" />
        </>
      )}
      {module === 'activity' && (
        <>
          <path {...common} d="M4.2 7.2A6.6 6.6 0 1 1 3.6 12" />
          <path {...common} d="M3.4 4.2v3.4h3.4" />
          <path {...common} d="M10 6.4V10l2.4 1.6" />
        </>
      )}
      {module === 'preferences' && (
        <>
          <path {...common} d="M10 2.6 16.4 6.3v7.4L10 17.4 3.6 13.7V6.3z" />
          <circle {...common} cx="10" cy="10" r="2.6" />
        </>
      )}
    </svg>
  )
}
