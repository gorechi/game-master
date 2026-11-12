import type { ThemeName } from '@shared/settings'

/**
 * Тема — это атрибут на <html>, а не состояние React:
 * так её можно применить до первой отрисовки и избежать вспышки.
 */
const THEME_CACHE_KEY = 'game-master.theme'

export function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme

  try {
    window.localStorage.setItem(THEME_CACHE_KEY, theme)
  } catch {
    // Приватный режим браузера: кэш недоступен, тема всё равно применится.
  }
}

export function readCachedTheme(): ThemeName | null {
  try {
    const value = window.localStorage.getItem(THEME_CACHE_KEY)
    return value === 'dark' || value === 'light' ? value : null
  } catch {
    return null
  }
}
