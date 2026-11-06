import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, KeyRound, Network, ShieldQuestion } from 'lucide-react'
import { toast } from 'sonner'
import type {
  IntelligenceConnectionMode,
  IntelligenceProviderId,
  IntelligenceProviderPublicConfig,
  IntelligencePublicConfig
} from '@shared/intelligence'

/**
 * Settings card for VirusTotal, LeakRadar and the future HakTrak Gateway.
 * Keys are write-only: once saved they are encrypted by the OS keychain in the
 * main process and only their last four characters are ever shown again.
 * No provider is contacted from here; lookups arrive in a later release.
 */
export function ThreatIntelligenceSettings() {
  const { t } = useTranslation('settings')
  const [config, setConfig] = useState<IntelligencePublicConfig | null>(null)

  const reload = useCallback(async () => {
    try {
      setConfig(await window.fabric.intelligenceGetConfig())
    } catch {
      setConfig(null)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const apply = async (work: () => Promise<IntelligencePublicConfig>, success?: string) => {
    try {
      setConfig(await work())
      if (success) toast.success(success)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
          : t('intel.saveFailed')
      )
    }
  }

  if (!config) {
    return (
      <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
        {t('intel.loading')}
      </p>
    )
  }

  const modes: IntelligenceConnectionMode[] = ['disabled', 'direct', 'gateway']

  return (
    <div className="intel-settings">
      <div className="intel-mode">
        <div className="intel-mode-header">
          <Network size={16} aria-hidden="true" />
          <div>
            <p className="intel-title">{t('intel.modeLabel')}</p>
            <p className="intel-desc">{t('intel.modeDesc')}</p>
          </div>
        </div>
        <div className="intel-mode-options" role="radiogroup" aria-label={t('intel.modeLabel')}>
          {modes.map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={config.mode === mode}
              className={`intel-mode-option ${config.mode === mode ? 'is-selected' : ''}`}
              onClick={() => apply(() => window.fabric.intelligenceSetMode(mode))}
            >
              <strong>{t(`intel.mode.${mode}`)}</strong>
              <small>{t(`intel.mode.${mode}Desc`)}</small>
            </button>
          ))}
        </div>
        {config.mode === 'disabled' && (
          <span className="status-badge is-idle">{t('intel.localModeBadge')}</span>
        )}
      </div>

      {!config.secureStorageAvailable && (
        <p className="intel-warning" role="alert">
          {t('intel.noSecureStorage')}
        </p>
      )}

      {(['virustotal', 'leakradar'] as IntelligenceProviderId[]).map((id) => (
        <ProviderCard
          key={id}
          provider={config.providers[id]}
          disabled={!config.secureStorageAvailable}
          onSave={(update) =>
            apply(() => window.fabric.intelligenceSetProvider(id, update), t('intel.saved'))
          }
          onClear={() =>
            apply(() => window.fabric.intelligenceClearProvider(id), t('intel.cleared'))
          }
        />
      ))}

      <GatewayCard
        config={config}
        disabled={!config.secureStorageAvailable}
        onSave={(update) =>
          apply(() => window.fabric.intelligenceSetGateway(update), t('intel.saved'))
        }
      />
    </div>
  )
}

function StateBadge({ provider }: { provider: IntelligenceProviderPublicConfig }) {
  const { t } = useTranslation('settings')
  const cls =
    provider.state === 'integration_pending'
      ? 'is-ready'
      : provider.state === 'local_mode'
        ? 'is-idle'
        : 'is-pending'
  return <span className={`status-badge ${cls}`}>{t(`intel.state.${provider.state}`)}</span>
}

function SecretInput({
  value,
  onChange,
  placeholder,
  label,
  disabled
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  label: string
  disabled?: boolean
}) {
  const { t } = useTranslation('settings')
  const [visible, setVisible] = useState(false)
  return (
    <div className="intel-secret">
      <input
        type={visible ? 'text' : 'password'}
        autoComplete="off"
        spellCheck={false}
        aria-label={label}
        className="fc-input"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className="fc-icon-button"
        aria-label={visible ? t('intel.hideKey') : t('intel.showKey')}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}

function ProviderCard({
  provider,
  disabled,
  onSave,
  onClear
}: {
  provider: IntelligenceProviderPublicConfig
  disabled: boolean
  onSave: (update: { enabled?: boolean; endpoint?: string; apiKey?: string }) => Promise<void>
  onClear: () => Promise<void>
}) {
  const { t } = useTranslation('settings')
  const [apiKey, setApiKey] = useState('')
  const [endpoint, setEndpoint] = useState(provider.endpoint)

  useEffect(() => setEndpoint(provider.endpoint), [provider.endpoint])

  const save = async () => {
    await onSave({ endpoint: endpoint.trim(), ...(apiKey ? { apiKey } : {}) })
    setApiKey('')
  }

  return (
    <div className="intel-provider">
      <div className="intel-provider-header">
        <div className="intel-provider-name">
          {provider.id === 'virustotal' ? <ShieldQuestion size={16} /> : <KeyRound size={16} />}
          <div>
            <p className="intel-title">{t(`intel.provider.${provider.id}`)}</p>
            <p className="intel-desc">{t(`intel.provider.${provider.id}Desc`)}</p>
          </div>
        </div>
        <div className="intel-provider-status">
          <StateBadge provider={provider} />
          <label className="intel-enable">
            <input
              type="checkbox"
              checked={provider.enabled}
              disabled={disabled}
              onChange={(e) => onSave({ enabled: e.target.checked })}
            />
            {t('intel.enable')}
          </label>
        </div>
      </div>
      <div className="intel-fields">
        <label className="intel-field">
          <span>{t('intel.apiKey')}</span>
          <SecretInput
            label={t('intel.apiKey')}
            value={apiKey}
            onChange={setApiKey}
            disabled={disabled}
            placeholder={
              provider.hasApiKey
                ? t('intel.keyStored', { hint: provider.apiKeyHint ?? '' })
                : t('intel.keyPlaceholder')
            }
          />
        </label>
        <label className="intel-field">
          <span>{t('intel.endpoint')}</span>
          <input
            type="url"
            className="fc-input"
            value={endpoint}
            placeholder={t('intel.endpointPlaceholder')}
            disabled={disabled}
            onChange={(e) => setEndpoint(e.target.value)}
          />
        </label>
      </div>
      <div className="intel-actions">
        <button
          type="button"
          className="fc-button fc-button-primary"
          disabled={disabled}
          onClick={save}
        >
          {t('intel.save')}
        </button>
        <button
          type="button"
          className="fc-button"
          disabled={!provider.hasApiKey && !provider.endpoint && !provider.enabled}
          onClick={onClear}
        >
          {t('intel.clear')}
        </button>
      </div>
      {provider.id === 'virustotal' && <p className="intel-note">{t('intel.vtPrivacyNote')}</p>}
    </div>
  )
}

function GatewayCard({
  config,
  disabled,
  onSave
}: {
  config: IntelligencePublicConfig
  disabled: boolean
  onSave: (update: { url?: string; token?: string; clearToken?: boolean }) => Promise<void>
}) {
  const { t } = useTranslation('settings')
  const [url, setUrl] = useState(config.gateway.url)
  const [token, setToken] = useState('')
  useEffect(() => setUrl(config.gateway.url), [config.gateway.url])

  return (
    <div className="intel-provider">
      <div className="intel-provider-header">
        <div className="intel-provider-name">
          <Network size={16} />
          <div>
            <p className="intel-title">{t('intel.gateway')}</p>
            <p className="intel-desc">{t('intel.gatewayDesc')}</p>
          </div>
        </div>
        <span className="status-badge is-idle">{t('intel.future')}</span>
      </div>
      <div className="intel-fields">
        <label className="intel-field">
          <span>{t('intel.gatewayUrl')}</span>
          <input
            type="url"
            className="fc-input"
            value={url}
            placeholder="https://gateway.haktrak.example/api"
            disabled={disabled}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <label className="intel-field">
          <span>{t('intel.gatewayToken')}</span>
          <SecretInput
            label={t('intel.gatewayToken')}
            value={token}
            onChange={setToken}
            disabled={disabled}
            placeholder={
              config.gateway.hasToken
                ? t('intel.keyStored', { hint: config.gateway.tokenHint ?? '' })
                : t('intel.tokenPlaceholder')
            }
          />
        </label>
      </div>
      <div className="intel-actions">
        <button
          type="button"
          className="fc-button fc-button-primary"
          disabled={disabled}
          onClick={async () => {
            await onSave({ url: url.trim(), ...(token ? { token } : {}) })
            setToken('')
          }}
        >
          {t('intel.save')}
        </button>
        {config.gateway.hasToken && (
          <button type="button" className="fc-button" onClick={() => onSave({ clearToken: true })}>
            {t('intel.clearToken')}
          </button>
        )}
      </div>
    </div>
  )
}
