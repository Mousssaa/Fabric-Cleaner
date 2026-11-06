import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ shell: { trashItem: vi.fn() } }))

import {
  dispose,
  getDisposalHistory,
  protectedReason,
  type ExecutionDeps
} from './execution-engine'

const linuxDeps = (over: Partial<ExecutionDeps> = {}): ExecutionDeps => ({
  platform: 'linux',
  home: '/home/user',
  env: {},
  trash: vi.fn(async () => {}),
  realpath: async (p) => p,
  isLink: async () => false,
  ...over
})

const winDeps: ExecutionDeps = {
  platform: 'win32',
  home: 'C:\\Users\\user',
  env: {
    SystemDrive: 'C:',
    WINDIR: 'C:\\Windows',
    ProgramFiles: 'C:\\Program Files',
    LOCALAPPDATA: 'C:\\Users\\user\\AppData\\Local'
  },
  trash: async () => {},
  realpath: async (p) => p,
  isLink: async () => false
}

describe('ExecutionEngine protected paths', () => {
  it('refuses OS roots, system trees and the home folder on Linux', () => {
    const d = linuxDeps()
    expect(protectedReason('/', d)).toBe('protected-root')
    expect(protectedReason('/home/user', d)).toBe('protected-root')
    expect(protectedReason('/etc/passwd', d)).toBe('protected-system-path')
    expect(protectedReason('/usr/bin/ls', d)).toBe('protected-system-path')
    expect(protectedReason('relative/path', d)).toBe('not-absolute')
    expect(protectedReason('/home/user/.cache/thumbnails', d)).toBeNull()
  })

  it('refuses Windows system folders case-insensitively but allows temp caches', () => {
    expect(protectedReason('C:\\', winDeps)).toBe('protected-root')
    expect(protectedReason('c:\\windows', winDeps)).toBe('protected-root')
    expect(protectedReason('C:\\Windows\\System32\\drivers', winDeps)).toBe('protected-system-path')
    expect(protectedReason('C:\\Users\\user\\AppData\\Local', winDeps)).toBe('protected-root')
    expect(protectedReason('C:\\Windows\\Temp\\x.tmp', winDeps)).toBeNull()
    expect(protectedReason('C:\\Users\\user\\AppData\\Local\\Temp\\a', winDeps)).toBeNull()
  })

  it('refuses macOS system volumes', () => {
    const d = { ...linuxDeps(), platform: 'darwin' as const, home: '/Users/me' }
    expect(protectedReason('/System/Library/Kernels', d)).toBe('protected-system-path')
    expect(protectedReason('/Users/me', d)).toBe('protected-root')
    expect(protectedReason('/Users/me/Library/Caches/com.example', d)).toBeNull()
  })
})

describe('ExecutionEngine dispose', () => {
  it('moves items to the Trash by default and never deletes permanently', async () => {
    const trash = vi.fn(async () => {})
    const permanentDelete = vi.fn(async () => ({ success: true }))
    const r = await dispose('/home/user/.cache/a', {
      mode: 'trash',
      permanentDelete,
      deps: linuxDeps({ trash })
    })
    expect(r).toMatchObject({ success: true, mode: 'trash' })
    expect(trash).toHaveBeenCalledWith('/home/user/.cache/a')
    expect(permanentDelete).not.toHaveBeenCalled()
  })

  it('fails closed when the Trash is unavailable', async () => {
    const permanentDelete = vi.fn(async () => ({ success: true }))
    const r = await dispose('/home/user/.cache/a', {
      mode: 'trash',
      permanentDelete,
      deps: linuxDeps({ trash: async () => Promise.reject(new Error('no trash')) })
    })
    expect(r).toMatchObject({ success: false, reason: 'trash-unavailable' })
    expect(permanentDelete).not.toHaveBeenCalled()
  })

  it('refuses links and link targets that resolve into protected paths', async () => {
    const permanentDelete = vi.fn(async () => ({ success: true }))
    const link = await dispose('/home/user/.cache/link', {
      mode: 'permanent',
      permanentDelete,
      deps: linuxDeps({ isLink: async () => true })
    })
    expect(link.reason).toBe('link-not-followed')
    const escaped = await dispose('/home/user/.cache/dir', {
      mode: 'permanent',
      permanentDelete,
      deps: linuxDeps({ realpath: async () => '/etc/ssh' })
    })
    expect(escaped.reason).toBe('protected-system-path')
    expect(permanentDelete).not.toHaveBeenCalled()
  })

  it('uses the injected permanent deleter in permanent mode and records history', async () => {
    const permanentDelete = vi.fn(async () => ({ success: true }))
    const r = await dispose('/home/user/.cache/b', {
      mode: 'permanent',
      origin: 'cli',
      permanentDelete,
      deps: linuxDeps()
    })
    expect(r).toMatchObject({ success: true, mode: 'permanent' })
    expect(getDisposalHistory().at(-1)).toMatchObject({
      path: '/home/user/.cache/b',
      origin: 'cli',
      success: true
    })
  })
})
