import type { JSX } from 'react'
import type { GameMonster } from '@shared/game'
import { formatChallengeRating } from '@shared/domain'
import { useI18n } from '@renderer/i18n/LocaleProvider'
import { Modal } from '../ui/Modal'
import { IconMonsterFace } from '../ui/icons'

interface PlaceMonstersModalProps {
  open: boolean
  placeName: string
  monsters: readonly GameMonster[]
  onClose: () => void
}

/** Список живых монстров, размещённых в выбранной локации. */
export function PlaceMonstersModal({
  open,
  placeName,
  monsters,
  onClose
}: PlaceMonstersModalProps): JSX.Element {
  const { messages: m, fill } = useI18n()

  return (
    <Modal
      open={open}
      title={m.maps.monsters.title}
      description={placeName}
      onClose={onClose}
      footer={
        <button type="button" className="button" onClick={onClose}>
          {m.maps.monsters.close}
        </button>
      }
    >
      {monsters.length === 0 ? (
        <p className="muted">{m.maps.monsters.empty}</p>
      ) : (
        <ul className="place-monsters">
          {monsters.map((monster) => (
            <li className="place-monsters__row" key={monster.id}>
              <span className="place-monsters__sigil" aria-hidden="true">
                <IconMonsterFace width={16} height={16} />
              </span>
              <span className="place-monsters__body">
                <span className="place-monsters__name">{monster.name}</span>
                <span className="place-monsters__meta">
                  {fill(m.maps.monsters.stats, {
                    hp: monster.hitPoints,
                    cr: formatChallengeRating(monster.challengeRating)
                  })}
                </span>
                {monster.statuses.length > 0 ? (
                  <span className="place-monsters__statuses">
                    {monster.statuses.map((status) => (
                      <span className="status-tag" key={status}>
                        {status}
                      </span>
                    ))}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
