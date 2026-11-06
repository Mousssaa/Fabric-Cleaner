import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ ipcMain: { handle: vi.fn(), on: vi.fn(), once: vi.fn() } }))

import { isTrustedRendererUrl, resolveTrustedRendererUrl } from './ipc-guard'

describe('ipc-guard', () => {
  it('trusts only the bundled index.html for file:// builds', () => {
    const trusted = resolveTrustedRendererUrl(
      undefined,
      '/opt/Fabric Cleaner/resources/app/out/renderer'
    )
    expect(isTrustedRendererUrl(trusted.href + '#/settings', trusted)).toBe(true)
    expect(isTrustedRendererUrl('file:///etc/passwd', trusted)).toBe(false)
    expect(isTrustedRendererUrl('https://evil.example/', trusted)).toBe(false)
  })

  it('trusts only the dev server origin in development', () => {
    const trusted = resolveTrustedRendererUrl('http://localhost:5173', '/unused')
    expect(isTrustedRendererUrl('http://localhost:5173/#/', trusted)).toBe(true)
    expect(isTrustedRendererUrl('http://localhost:5174/', trusted)).toBe(false)
    expect(isTrustedRendererUrl('not a url', trusted)).toBe(false)
  })
})
