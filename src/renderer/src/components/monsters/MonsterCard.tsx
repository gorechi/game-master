import type { JSX } from 'react'
import type { Monster } from '@shared/monster'
import {
  formatChallengeRating,
  formatModifier,
  modifierFromScore
} from '@shared/domain'
import { MONSTER_STAT_FIELDS } from '@renderer/lib/monsterStats'
import { useI18n } from '@renderer/i18n/LocaleProvider'
import { IconPencil, IconSkull, IconTrash } from '../ui/icons'

interface MonsterCardProps {
  monster: Pick<
    Monster,
    | 'name'
    | 'strength'
    | 'dexterity'
    | 'intelligence'
    | 'wisdom'
    | 'constitution'
    | 'charisma'
    | 'challengeRating'
    | 'armorClass'
    | 'hitPoints'
  >
  badge?: string
  /** Сеттинг монстра — показывается, чтобы записи разных миров не путались. */
  realmName?: string
  /** Статусы уникального существа. */
  statuses?: readonly string[]
  onEdit: () => void
  onDelete: () => void
}

/** Горизонтальная карточка монстра — как у игроков. */
export function MonsterCard({
  monster,
  badge,
  realmName,
  statuses,
  onEdit,
  onDelete
}: MonsterCardProps): JSX.Element {
  const { messages: m, fill } = useI18n()

  return (
    <li className="monster-card">
      <div className="monster-card__identity">
        <span className="monster-card__sigil" aria-hidden="true">
          <IconSkull width={22} height={22} />
        </span>

        <div className="monster-card__titles">
          <h3 className="monster-card__name">{monster.name}</h3>
          <div className="monster-card__chips">
            {realmName ? <span className="monster-chip">{realmName}</span> : null}
            {badge ? <span className="monster-chip monster-chip--unique">{badge}</span> : null}
            <span className="monster-chip monster-chip--cr">
              {fill(m.bestiary.card.challengeRating, {
                cr: formatChallengeRating(monster.challengeRating)
              })}
            </span>
            <span className="monster-chip">
              {fill(m.bestiary.card.armorClass, { ac: monster.armorClass })}
            </span>
            <span className="monster-chip">
              {fill(m.bestiary.card.hitPoints, { hp: monster.hitPoints })}
            </span>
          </div>

          {statuses && statuses.length > 0 ? (
            <div className="monster-card__statuses">
              {statuses.map((status) => (
                <span key={status} className="status-tag">
                  {status}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="monster-card__stats">
        {MONSTER_STAT_FIELDS.map((stat) => (
          <span className="monster-stat" key={stat.key} title={stat.label}>
            <span className="monster-stat__label">{stat.short}</span>
            <span className="monster-stat__modifier">
              {formatModifier(modifierFromScore(monster[stat.key]))}
            </span>
            <span className="monster-stat__value">{monster[stat.key]}</span>
          </span>
        ))}
      </div>

      <div className="monster-card__actions">
        <button
          type="button"
          className="icon-button"
          title={m.bestiary.card.edit}
          aria-label={fill(m.bestiary.card.editAria, { name: monster.name })}
          onClick={onEdit}
        >
          <IconPencil />
        </button>
        <button
          type="button"
          className="icon-button icon-button--danger"
          title={m.bestiary.card.delete}
          aria-label={fill(m.bestiary.card.deleteAria, { name: monster.name })}
          onClick={onDelete}
        >
          <IconTrash />
        </button>
      </div>
    </li>
  )
}
