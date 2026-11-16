/**
 * Общие типы системы локалей.
 *
 * Локали — обычные вложенные объекты с английскими ключами. Базовая русская
 * локаль задаёт форму сообщений, остальные локали должны ей соответствовать.
 */

/** Формы множественного числа по правилам CLDR. */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & {
  other: string
}

/** Значения для подстановки в шаблон: `{name}`, `{count}` и т.п. */
export type MessageValues = Record<string, string | number>
