import type { JSX } from 'react'
import type { Player } from '@shared/player'
import type { CharacterProfile } from '@shared/characterProfile'
import { playerFullName } from '@shared/domain'
import { useI18n, useMessages } from '@renderer/i18n/LocaleProvider'
import { IconPencil, IconTrash } from '../ui/icons'

interface CharacterCardProps {
  profile: CharacterProfile
  player: Player | undefined
  /** Название сеттинга — карточки из разных миров не смешиваются визуально. */
  realmName?: string
  onEdit: () => void
  onDelete: () => void
  /** Переход на экран игрока; на самом экране игрока не нужен. */
  onOpenPlayer?: (playerId: string) => void
}

/** Вертикальная карточка героя в духе коллекционных. */
export function CharacterCard({
  profile,
  player,
  realmName,
  onEdit,
  onDelete,
  onOpenPlayer
}: CharacterCardProps): JSX.Element {
  const { messages: m, fill } = useI18n()

  return (
    <li className="hero-card">
      <div className="hero-card__inner">
        <header className="hero-card__head">
          <h3 className="hero-card__name" title={profile.name}>
            {profile.name}
          </h3>
          <span
            className="hero-card__class"
            title={profile.className || m.people.characterCard.classMissingTitle}
          >
            {profile.className || m.people.characterCard.noClass}
          </span>
        </header>

        <div className="hero-card__art">
          <span
            className="hero-card__level"
            aria-label={fill(m.people.characterCard.levelAria, { level: profile.level })}
          >
            {fill(m.people.characterCard.level, { level: profile.level })}
          </span>
          {profile.image ? (
            <img
              src={profile.image}
              alt={fill(m.people.characterCard.portraitAlt, { name: profile.name })}
              loading="lazy"
            />
          ) : (
            <HeroPlaceholder />
          )}
        </div>

        <dl className="hero-card__facts">
          <div>
            <dt>{m.people.characterCard.realmLabel}</dt>
            <dd>{realmName || '—'}</dd>
          </div>
          <div>
            <dt>{m.people.characterCard.raceLabel}</dt>
            <dd>{profile.race || '—'}</dd>
          </div>
          <div>
            <dt>{m.people.characterCard.playerLabel}</dt>
            <dd>
              {player ? (
                onOpenPlayer ? (
                  <button
                    type="button"
                    className="hero-card__player"
                    onClick={() => onOpenPlayer(player.id)}
                    title={fill(m.people.characterCard.playerTitle, {
                      name: playerFullName(player)
                    })}
                  >
                    {playerFullName(player)}
                  </button>
                ) : (
                  playerFullName(player)
                )
              ) : (
                <span className="hero-card__no-player">{m.people.characterCard.noPlayer}</span>
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
            <span className="hero-card__no-status">{m.people.characterCard.noStatuses}</span>
          )}
        </div>

        <footer className="hero-card__tools">
          <button
            type="button"
            className="icon-button"
            title={m.people.characterCard.edit}
            aria-label={fill(m.people.characterCard.editAria, { name: profile.name })}
            onClick={onEdit}
          >
            <IconPencil />
          </button>
          <button
            type="button"
            className="icon-button icon-button--danger"
            title={m.people.characterCard.delete}
            aria-label={fill(m.people.characterCard.deleteAria, { name: profile.name })}
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
  const m = useMessages()
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
      <span className="portrait-placeholder__label">{m.people.characterCard.noPortrait}</span>
    </span>
  )
}
