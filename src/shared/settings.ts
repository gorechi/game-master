/**
 * Настройки приложения. Файл общий для main и renderer,
 * поэтому здесь нет zod — схема валидации живёт в main.
 */

export const THEMES = ['dark', 'light'] as const
export type ThemeName = (typeof THEMES)[number]

export interface AppSettings {
  schemaVersion: number
  theme: ThemeName
  /** Активный сеттинг; null — будет выбран первый доступный. */
  activeRealmId: string | null
}

export const SETTINGS_SCHEMA_VERSION = 1

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  theme: 'dark',
  activeRealmId: null
}

export interface SettingsPatch {
  theme?: ThemeName
  activeRealmId?: string | null
}

export function isThemeName(value: unknown): value is ThemeName {
  return value === 'dark' || value === 'light'
}

export const themeLabels: Record<ThemeName, string> = {
  dark: 'Подземелье',
  light: 'Рукопись'
}
