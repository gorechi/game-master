import { isLocaleCode, type LocaleCode } from '@shared/i18n'

/**
 * Последний выбранный язык. Нужен только для первого кадра: настройки
 * подгрузятся асинхронно, а интерфейс не должен мигать другим языком.
 */
const LOCALE_CACHE_KEY = 'game-master.locale'

export function cacheLocale(locale: LocaleCode): void {
  try {
    window.localStorage.setItem(LOCALE_CACHE_KEY, locale)
  } catch {
    // Приватный режим браузера: кэш недоступен, настройки всё равно применятся.
  }
}

export function readCachedLocale(): LocaleCode | null {
  try {
    const value = window.localStorage.getItem(LOCALE_CACHE_KEY)
    return isLocaleCode(value) ? value : null
  } catch {
    return null
  }
}
