import type {
  IntelligenceConnectionMode,
  IntelligenceProviderId,
  IntelligenceProviderState
} from '../../../shared/intelligence'

// ─── Normalised provider results ─────────────────────────────────────
// Every adapter returns one of these shapes so callers never depend on a
// provider's raw response format.

/** Returned whenever a provider cannot answer yet. Never thrown. */
export interface ProviderNotReady {
  configured: boolean
  status: IntelligenceProviderState
  provider: IntelligenceProviderId
  message: string
}

export type Verdict = 'clean' | 'suspicious' | 'malicious' | 'unknown'

export interface ReputationResult {
  configured: true
  status: 'ok'
  provider: IntelligenceProviderId
  subject: string
  verdict: Verdict
  /** e.g. engines flagging / engines total, when the provider reports it. */
  detections?: { flagged: number; total: number }
  checkedAt: string
  permalink?: string
}

export interface ExposureRecord {
  source: string
  breachedAt: string | null
  dataClasses: string[]
}

export interface ExposureResult {
  configured: true
  status: 'ok'
  provider: IntelligenceProviderId
  subject: string
  exposures: ExposureRecord[]
  checkedAt: string
}

export type ReputationResponse = ReputationResult | ProviderNotReady
export type ExposureResponse = ExposureResult | ProviderNotReady

// ─── Adapter contracts ───────────────────────────────────────────────

/**
 * VirusTotal: reputation lookups only. Hash lookup is deliberately the only
 * file-related operation. Submitting (uploading) a file is a separate,
 * consent-gated capability that is NOT part of this interface and must never
 * be triggered implicitly by a lookup.
 */
export interface VirusTotalAdapter {
  readonly id: 'virustotal'
  lookupFileHash(sha256: string): Promise<ReputationResponse>
  checkUrl(url: string): Promise<ReputationResponse>
  checkDomain(domain: string): Promise<ReputationResponse>
  checkIp(ip: string): Promise<ReputationResponse>
}

/** LeakRadar: breach / exposure intelligence. */
export interface LeakRadarAdapter {
  readonly id: 'leakradar'
  lookupEmailExposure(email: string): Promise<ExposureResponse>
  lookupDomainExposure(domain: string): Promise<ExposureResponse>
}

/** Future HakTrak API Gateway. Holds provider keys server-side. */
export interface HakTrakGatewayConfig {
  url: string
  /** Device/user token for the gateway; stored encrypted when set. */
  token: string | null
}

/** What an adapter needs at call time. Secrets stay in the main process. */
export interface ProviderRuntimeConfig {
  mode: IntelligenceConnectionMode
  enabled: boolean
  endpoint: string
  apiKey: string | null
  gateway: HakTrakGatewayConfig
}
