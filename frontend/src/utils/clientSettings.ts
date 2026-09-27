const SETTINGS_KEY = 'tactics.settings'

export type CombatViewSetting = 'classic' | '3d'

export interface ClientSettings {
  combatView: CombatViewSetting
}

export const DEFAULT_CLIENT_SETTINGS: ClientSettings = {
  combatView: 'classic',
}

const isCombatView = (value: unknown): value is CombatViewSetting =>
  value === 'classic' || value === '3d'

export const parseClientSettings = (raw: string | null): ClientSettings => {
  if (!raw) return { ...DEFAULT_CLIENT_SETTINGS }
  try {
    const value = JSON.parse(raw) as Partial<ClientSettings> | null
    return {
      combatView: isCombatView(value?.combatView)
        ? value.combatView
        : DEFAULT_CLIENT_SETTINGS.combatView,
    }
  } catch {
    return { ...DEFAULT_CLIENT_SETTINGS }
  }
}

export const loadClientSettings = (): ClientSettings => {
  try {
    return parseClientSettings(localStorage.getItem(SETTINGS_KEY))
  } catch {
    return { ...DEFAULT_CLIENT_SETTINGS }
  }
}

export const saveClientSettings = (settings: ClientSettings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the setting then lasts for this tab only.
  }
}
