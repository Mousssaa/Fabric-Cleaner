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

  it('accepts packaged Windows file:// URLs however Chromium spells them', () => {
    const trusted = new URL(
      'file:///C:/Program%20Files/Fabric%20Cleaner/resources/app.asar/out/renderer/index.html'
    )
    const spellings = [
      'file:///C:/Program%20Files/Fabric%20Cleaner/resources/app.asar/out/renderer/index.html#/',
      'file:///c:/program%20files/fabric%20cleaner/resources/app.asar/out/renderer/index.html',
      'file:///C:/Program Files/Fabric Cleaner/resources/app.asar/out/renderer/index.html#/settings'
    ]
    for (const url of spellings) expect(isTrustedRendererUrl(url, trusted, 'win32')).toBe(true)
    expect(
      isTrustedRendererUrl(
        'file:///C:/Program%20Files/Fabric%20Cleaner/resources/app.asar/out/renderer/other.html',
        trusted,
        'win32'
      )
    ).toBe(false)
    expect(
      isTrustedRendererUrl('file:///D:/Program%20Files/Fabric%20Cleaner/x.html', trusted, 'win32')
    ).toBe(false)
  })

  it('accepts non-ASCII and reserved characters in portable/user install paths', () => {
    // Arabic user name plus "#" — Node encodes both, Chromium may not encode the same way.
    const trusted = resolveTrustedRendererUrl(undefined, '/Users/محمد#1/Apps/Fabric Cleaner.app/r')
    const decoded =
      'file:///Users/' + encodeURIComponent('محمد') + '%231/Apps/Fabric%20Cleaner.app/r/index.html'
    expect(isTrustedRendererUrl(decoded, trusted, 'darwin')).toBe(true)
    expect(isTrustedRendererUrl(trusted.href, trusted, 'darwin')).toBe(true)
  })

  it('keeps macOS/Linux paths case-sensitive and rejects encoded separators', () => {
    const trusted = new URL(
      'file:///Applications/Fabric%20Cleaner.app/Contents/Resources/app.asar/out/renderer/index.html'
    )
    expect(isTrustedRendererUrl(trusted.href, trusted, 'darwin')).toBe(true)
    expect(isTrustedRendererUrl(trusted.href.toLowerCase(), trusted, 'darwin')).toBe(false)
    expect(
      isTrustedRendererUrl(
        'file:///Applications/Fabric%20Cleaner.app/Contents/Resources/app.asar/out/renderer%2Findex.html',
        trusted,
        'darwin'
      )
    ).toBe(false)
  })
})
