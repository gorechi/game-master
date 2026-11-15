/**
 * Единый порядок и подписи характеристик монстра.
 * Используется в карточках, форме и схватке, чтобы порядок не расходился.
 */
export const MONSTER_STAT_FIELDS = [
  { key: 'strength', short: 'СИЛ', label: 'Сила' },
  { key: 'dexterity', short: 'ЛОВ', label: 'Ловкость' },
  { key: 'constitution', short: 'ТЕЛ', label: 'Телосложение' },
  { key: 'intelligence', short: 'ИНТ', label: 'Интеллект' },
  { key: 'wisdom', short: 'МДР', label: 'Мудрость' },
  { key: 'charisma', short: 'ХАР', label: 'Харизма' }
] as const
