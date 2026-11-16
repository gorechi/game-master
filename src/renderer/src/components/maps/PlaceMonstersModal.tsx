import type { JSX } from 'react'
import type { GameMonster } from '@shared/game'
import { formatChallengeRating } from '@shared/domain'
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
  return (
    <Modal
      open={open}
      title="Монстры в локации"
      description={placeName}
      onClose={onClose}
      footer={
        <button type="button" className="button" onClick={onClose}>
          Закрыть
        </button>
      }
    >
      {monsters.length === 0 ? (
        <p className="muted">В этой локации нет живых монстров.</p>
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
                  ХП {monster.hitPoints} · КО {formatChallengeRating(monster.challengeRating)}
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
