import { m } from '@shared/i18n'

/** Характеристики монстра: полный набор ключей. */
export type MonsterStatKey =
  | 'strength'
  | 'dexterity'
  | 'constitution'
  | 'intelligence'
  | 'wisdom'
  | 'charisma'

/**
 * Поле характеристики. Подписи читаются из локали в момент обращения,
 * поэтому смена языка сразу отражается и в карточках, и в схватке.
 */
function statField(key: MonsterStatKey): {
  key: MonsterStatKey
  readonly short: string
  readonly label: string
} {
  return {
    key,
    get short(): string {
      return m().bestiary.stats[key].short
    },
    get label(): string {
      return m().bestiary.stats[key].label
    }
  }
}

/**
 * Единый порядок и подписи характеристик монстра.
 * Используется в карточках, форме и схватке, чтобы порядок не расходился.
 */
export const MONSTER_STAT_FIELDS = [
  statField('strength'),
  statField('dexterity'),
  statField('constitution'),
  statField('intelligence'),
  statField('wisdom'),
  statField('charisma')
] as const
