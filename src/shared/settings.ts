/**
 * Настройки приложения. Файл общий для main и renderer,
 * поэтому здесь нет zod — схема валидации живёт в main.
 */

import { DEFAULT_LOCALE, type LocaleCode } from './i18n'

export const THEMES = ['dark', 'light'] as const
export type ThemeName = (typeof THEMES)[number]

export interface AppSettings {
  schemaVersion: number
  theme: ThemeName
  locale: LocaleCode
}

export const SETTINGS_SCHEMA_VERSION = 1

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  theme: 'dark',
  locale: DEFAULT_LOCALE
}

export interface SettingsPatch {
  theme?: ThemeName
  locale?: LocaleCode
}

export function isThemeName(value: unknown): value is ThemeName {
  return value === 'dark' || value === 'light'
}
