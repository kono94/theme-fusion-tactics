import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_CLIENT_SETTINGS,
  loadClientSettings,
  parseClientSettings,
  saveClientSettings,
} from './clientSettings'

describe('client settings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to the classic combat view', () => {
    expect(loadClientSettings()).toEqual({ combatView: 'classic' })
  })

  it('persists the combat view across visits', () => {
    saveClientSettings({ combatView: '3d' })
    expect(loadClientSettings()).toEqual({ combatView: '3d' })
  })

  it('falls back to defaults for malformed or unknown values', () => {
    expect(parseClientSettings('{not json')).toEqual(DEFAULT_CLIENT_SETTINGS)
    expect(parseClientSettings('null')).toEqual(DEFAULT_CLIENT_SETTINGS)
    expect(parseClientSettings('{"combatView":"vr"}')).toEqual(DEFAULT_CLIENT_SETTINGS)
  })

  it('keeps working when storage is unavailable', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    expect(() => saveClientSettings({ combatView: '3d' })).not.toThrow()
    expect(loadClientSettings()).toEqual(DEFAULT_CLIENT_SETTINGS)
  })
})
