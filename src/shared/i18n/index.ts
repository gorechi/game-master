import { en } from './locales/en'
import { ru } from './locales/ru'
import { DEFAULT_LOCALE, LOCALE_CODES, isLocaleCode, type LocaleCode } from './codes'
import type { MessageValues, PluralForms } from './types'

export { DEFAULT_LOCALE, LOCALE_CODES, isLocaleCode }
export type { LocaleCode }

/**
 * Форма сообщений любой локали. Строки остаются строками, объекты склонений
 * приводятся к `PluralForms`, чтобы языки с другим набором категорий
 * (например, только `one`/`other`) не были обязаны повторять русские формы.
 */
type Localized<T> = T extends string
  ? string
  : T extends { other: string }
    ? PluralForms
    : T extends object
      ? { [K in keyof T]: Localized<T[K]> }
      : T

/** Готовые сообщения русской локали: она задаёт форму всех остальных. */
export type Messages = Localized<typeof ru>

/** Реестр локалей. Новая локаль добавляется сюда и в `LOCALE_LABELS`. */
export const locales: Record<LocaleCode, Messages> = { ru, en }

/** Названия языков для выбора в настройках — на самом языке. */
export const LOCALE_LABELS: Record<LocaleCode, string> = {
  ru: ru.app.languageName,
  en: en.app.languageName
}

export function getMessages(locale: LocaleCode): Messages {
  return locales[locale] ?? locales[DEFAULT_LOCALE]
}

/**
 * Активная локаль для не-React кода (общие проверки, main-процесс).
 * React-интерфейс получает сообщения из провайдера, чтобы перерисовываться
 * при смене языка без перезагрузки.
 */
let activeLocale: LocaleCode = DEFAULT_LOCALE

export function getActiveLocale(): LocaleCode {
  return activeLocale
}

export function setActiveLocale(locale: LocaleCode): void {
  activeLocale = locale
}

/** Сообщения активной локали для функций вне React. */
export function m(): Messages {
  return getMessages(activeLocale)
}

/**
 * Подставляет значения в шаблон. Неизвестные плейсхолдеры остаются как есть,
 * чтобы ошибка в переводе была заметна, а не превращалась в пустую строку.
 */
export function fill(template: string, values: MessageValues): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
  )
}

const pluralRules = new Map<LocaleCode, Intl.PluralRules>()
const numberFormats = new Map<LocaleCode, Intl.NumberFormat>()

/**
 * Выбирает форму множественного числа и подставляет `{count}`.
 * Если для языка нет нужной категории, используется форма `other`.
 */
export function plural(locale: LocaleCode, count: number, forms: PluralForms): string {
  let rules = pluralRules.get(locale)
  if (!rules) {
    rules = new Intl.PluralRules(locale)
    pluralRules.set(locale, rules)
  }

  const category = rules.select(count)
  const template = forms[category] ?? forms.other
  let numberFormat = numberFormats.get(locale)
  if (!numberFormat) {
    numberFormat = new Intl.NumberFormat(locale)
    numberFormats.set(locale, numberFormat)
  }

  return template.replace(/\{count\}/g, numberFormat.format(count))
}

const dateFormats = new Map<LocaleCode, Intl.DateTimeFormat>()

/** Дата в формате выбранного языка: «16 ноября 2026 г.». */
export function formatDate(iso: string, locale: LocaleCode): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'

  let formatter = dateFormats.get(locale)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    dateFormats.set(locale, formatter)
  }

  return formatter.format(date)
}

export type { MessageValues, PluralForms }
