import type { JSX } from 'react'
import type { Monster } from '@shared/monster'
import {
  formatChallengeRating,
  formatModifier,
  modifierFromScore
} from '@shared/domain'
import { IconPencil, IconSkull, IconTrash } from '../ui/icons'

const STATS = [
  { key: 'strength', label: 'СИЛ', title: 'Сила' },
  { key: 'dexterity', label: 'ЛОВ', title: 'Ловкость' },
  { key: 'intelligence', label: 'ИНТ', title: 'Интеллект' },
  { key: 'wisdom', label: 'МДР', title: 'Мудрость' },
  { key: 'constitution', label: 'ТЕЛ', title: 'Телосложение' },
  { key: 'charisma', label: 'ХАР', title: 'Харизма' }
] as const

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
              КО {formatChallengeRating(monster.challengeRating)}
            </span>
            <span className="monster-chip">КЗ {monster.armorClass}</span>
            <span className="monster-chip">ХП {monster.hitPoints}</span>
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
        {STATS.map((stat) => (
          <span className="monster-stat" key={stat.key} title={stat.title}>
            <span className="monster-stat__label">{stat.label}</span>
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
          title="Редактировать"
          aria-label={`Редактировать монстра ${monster.name}`}
          onClick={onEdit}
        >
          <IconPencil />
        </button>
        <button
          type="button"
          className="icon-button icon-button--danger"
          title="Удалить"
          aria-label={`Удалить монстра ${monster.name}`}
          onClick={onDelete}
        >
          <IconTrash />
        </button>
      </div>
    </li>
  )
}
