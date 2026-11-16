import { createContext, useContext, useMemo } from 'react'
import type { JSX, ReactNode } from 'react'
import {
  fill,
  formatDate,
  getMessages,
  plural,
  setActiveLocale,
  type LocaleCode,
  type MessageValues,
  type Messages,
  type PluralForms
} from '@shared/i18n'
import { cacheLocale } from '@renderer/lib/locale'

interface I18nValue {
  locale: LocaleCode
  messages: Messages
  fill: (template: string, values: MessageValues) => string
  plural: (count: number, forms: PluralForms) => string
  formatDate: (iso: string) => string
}

const I18nContext = createContext<I18nValue | null>(null)

interface LocaleProviderProps {
  locale: LocaleCode
  children: ReactNode
}

/**
 * Локаль интерфейса. При смене языка контекст обновляется, поэтому все
 * компоненты перерисовываются сразу — перезагружать приложение не нужно.
 */
export function LocaleProvider({ locale, children }: LocaleProviderProps): JSX.Element {
  const value = useMemo<I18nValue>(() => {
    // Синхронно обновляем активную локаль для общих функций, которые читают
    // сообщения вне React (форматирование, проверки, подписи из shared).
    setActiveLocale(locale)
    cacheLocale(locale)
    document.documentElement.lang = locale
    document.title = getMessages(locale).app.name

    return {
      locale,
      messages: getMessages(locale),
      fill,
      plural: (count, forms) => plural(locale, count, forms),
      formatDate: (iso) => formatDate(iso, locale)
    }
  }, [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) {
    throw new Error('useI18n must be used inside LocaleProvider')
  }
  return value
}

export function useMessages(): Messages {
  return useI18n().messages
}

export function useLocale(): LocaleCode {
  return useI18n().locale
}
