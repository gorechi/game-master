import type { JSX } from 'react'
import type { Player } from '@shared/player'
import type { CharacterProfile } from '@shared/characterProfile'
import { playerFullName } from '@shared/domain'
import { IconPencil, IconTrash } from '../ui/icons'

interface CharacterCardProps {
  profile: CharacterProfile
  player: Player | undefined
  onEdit: () => void
  onDelete: () => void
  /** Переход на экран игрока; на самом экране игрока не нужен. */
  onOpenPlayer?: (playerId: string) => void
}

/** Вертикальная карточка героя в духе коллекционных. */
export function CharacterCard({
  profile,
  player,
  onEdit,
  onDelete,
  onOpenPlayer
}: CharacterCardProps): JSX.Element {
  return (
    <li className="hero-card">
      <div className="hero-card__inner">
        <header className="hero-card__head">
          <h3 className="hero-card__name" title={profile.name}>
            {profile.name}
          </h3>
          <span className="hero-card__class" title={profile.className || 'Класс не указан'}>
            {profile.className || 'Без класса'}
          </span>
        </header>

        <div className="hero-card__art">
          <span className="hero-card__level" aria-label={`Уровень ${profile.level}`}>
            Ур. {profile.level}
          </span>
          {profile.image ? (
            <img src={profile.image} alt={`Портрет: ${profile.name}`} loading="lazy" />
          ) : (
            <HeroPlaceholder />
          )}
        </div>

        <dl className="hero-card__facts">
          <div>
            <dt>Раса</dt>
            <dd>{profile.race || '—'}</dd>
          </div>
          <div>
            <dt>Игрок</dt>
            <dd>
              {player ? (
                onOpenPlayer ? (
                  <button
                    type="button"
                    className="hero-card__player"
                    onClick={() => onOpenPlayer(player.id)}
                    title={`Все персонажи игрока ${playerFullName(player)}`}
                  >
                    {playerFullName(player)}
                  </button>
                ) : (
                  playerFullName(player)
                )
              ) : (
                <span className="hero-card__no-player">Без игрока</span>
              )}
            </dd>
          </div>
        </dl>

        <div className="hero-card__statuses">
          {profile.statuses.length > 0 ? (
            profile.statuses.map((status) => (
              <span key={status} className="status-tag">
                {status}
              </span>
            ))
          ) : (
            <span className="hero-card__no-status">Без статусов</span>
          )}
        </div>

        <footer className="hero-card__tools">
          <button
            type="button"
            className="icon-button"
            title="Редактировать"
            aria-label={`Редактировать персонажа ${profile.name}`}
            onClick={onEdit}
          >
            <IconPencil />
          </button>
          <button
            type="button"
            className="icon-button icon-button--danger"
            title="Удалить"
            aria-label={`Удалить персонажа ${profile.name}`}
            onClick={onDelete}
          >
            <IconTrash />
          </button>
        </footer>
      </div>
    </li>
  )
}

export function HeroPlaceholder(): JSX.Element {
  return (
    <span className="portrait-placeholder" aria-hidden="true">
      <svg
        viewBox="0 0 120 120"
        width="64"
        height="64"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      >
        <path d="M60 12l36 15v32c0 26-18 44-36 51-18-7-36-25-36-51V27l36-15Z" opacity="0.9" />
        <path d="M60 42l19 32H41l19-32Z" opacity="0.7" />
      </svg>
      <span className="portrait-placeholder__label">Нет портрета</span>
    </span>
  )
}
