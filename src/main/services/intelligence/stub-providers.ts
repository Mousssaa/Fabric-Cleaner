import type { IntelligenceProviderId } from '../../../shared/intelligence'
import type {
  ExposureResponse,
  LeakRadarAdapter,
  ProviderNotReady,
  ProviderRuntimeConfig,
  ReputationResponse,
  VirusTotalAdapter
} from './types'

/**
 * Decide why a provider cannot answer. Stub adapters always end here: they
 * never open a socket, so the app builds and runs with no keys and offline.
 */
export function notReady(
  provider: IntelligenceProviderId,
  cfg: ProviderRuntimeConfig
): ProviderNotReady {
  if (cfg.mode === 'disabled') {
    return {
      configured: false,
      status: 'local_mode',
      provider,
      message: 'Local mode is active. External threat intelligence is turned off.'
    }
  }
  const hasCredential = cfg.mode === 'gateway' ? !!cfg.gateway.url : !!cfg.apiKey
  if (!cfg.enabled || !hasCredential) {
    return {
      configured: false,
      status: 'pending_setup',
      provider,
      message: 'Not configured. Ready for future setup.'
    }
  }
  return {
    configured: true,
    status: 'integration_pending',
    provider,
    message: 'Credentials saved. Live lookups arrive in a future Fabric Cleaner release.'
  }
}

export class StubVirusTotalAdapter implements VirusTotalAdapter {
  readonly id = 'virustotal' as const
  constructor(private readonly config: () => ProviderRuntimeConfig) {}
  private answer(): Promise<ReputationResponse> {
    return Promise.resolve(notReady(this.id, this.config()))
  }
  lookupFileHash(_sha256: string): Promise<ReputationResponse> {
    return this.answer()
  }
  checkUrl(_url: string): Promise<ReputationResponse> {
    return this.answer()
  }
  checkDomain(_domain: string): Promise<ReputationResponse> {
    return this.answer()
  }
  checkIp(_ip: string): Promise<ReputationResponse> {
    return this.answer()
  }
}

export class StubLeakRadarAdapter implements LeakRadarAdapter {
  readonly id = 'leakradar' as const
  constructor(private readonly config: () => ProviderRuntimeConfig) {}
  private answer(): Promise<ExposureResponse> {
    return Promise.resolve(notReady(this.id, this.config()))
  }
  lookupEmailExposure(_email: string): Promise<ExposureResponse> {
    return this.answer()
  }
  lookupDomainExposure(_domain: string): Promise<ExposureResponse> {
    return this.answer()
  }
}
