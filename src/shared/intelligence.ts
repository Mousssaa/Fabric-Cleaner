// ─── Threat intelligence: shared types (main + renderer) ────────────
// Fabric Cleaner ships with these integrations *prepared but inactive*.
// No provider makes a network request until a later release wires the
// real API clients. Secrets never cross into the renderer: it only sees
// whether a key is stored and its last four characters.

export type IntelligenceProviderId = 'virustotal' | 'leakradar'

/**
 * - `disabled`: Local stub mode. No provider is ever contacted (default).
 * - `direct`: Provider APIs called from this device with locally stored keys.
 *   Intended for local testing only.
 * - `gateway`: Requests go through a HakTrak API Gateway that holds the
 *   provider keys server-side (the production target).
 */
export type IntelligenceConnectionMode = 'disabled' | 'direct' | 'gateway'

export type IntelligenceProviderState =
  /** No key stored and/or provider switched off. */
  | 'pending_setup'
  /** Key stored and enabled, but live integration is not shipped yet. */
  | 'integration_pending'
  /** Connection mode is `disabled`, so the provider is not used. */
  | 'local_mode'

export interface IntelligenceProviderPublicConfig {
  id: IntelligenceProviderId
  enabled: boolean
  /** Optional custom API base URL. Empty = provider default. */
  endpoint: string
  hasApiKey: boolean
  /** Last four characters of the stored key, or null. */
  apiKeyHint: string | null
  state: IntelligenceProviderState
}

export interface IntelligencePublicConfig {
  mode: IntelligenceConnectionMode
  gateway: { url: string; hasToken: boolean; tokenHint: string | null }
  providers: Record<IntelligenceProviderId, IntelligenceProviderPublicConfig>
  /** False when the OS keychain is unavailable; secrets cannot be stored then. */
  secureStorageAvailable: boolean
}

export interface IntelligenceProviderUpdate {
  enabled?: boolean
  endpoint?: string
  /** A new key to store. Omit to keep the current key. */
  apiKey?: string
}

export const INTELLIGENCE_PROVIDER_IDS: readonly IntelligenceProviderId[] = [
  'virustotal',
  'leakradar'
] as const

export const INTELLIGENCE_MODES: readonly IntelligenceConnectionMode[] = [
  'disabled',
  'direct',
  'gateway'
] as const
