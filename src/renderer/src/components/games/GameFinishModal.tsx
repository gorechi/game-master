import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import type { Game } from '@shared/game'
import { formatChallengeRating } from '@shared/domain'
import { api, errorMessage } from '@renderer/lib/api'
import { useI18n } from '@renderer/i18n/LocaleProvider'
import { Modal } from '../ui/Modal'
import { IconLock } from '../ui/icons'

interface GameFinishModalProps {
  open: boolean
  game: Game | null
  onClose: () => void
  /** Ошибки пробрасываются в модалку, чтобы она осталась открытой. */
  onFinish: (keepMonsterIds: string[]) => Promise<void>
}

/**
 * Завершение игры с выбором монстров, которых нужно сохранить.
 * Отмеченные уходят в список игровых монстров, остальные остаются в игре
 * и исчезнут вместе с ней при удалении.
 */
export function GameFinishModal({
  open,
  game,
  onClose,
  onFinish
}: GameFinishModalProps): JSX.Element {
  const { messages: m, fill, plural } = useI18n()
  const [keepIds, setKeepIds] = useState<string[]>([])
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [loadingSaved, setLoadingSaved] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open || !game) return

    setKeepIds([])
    setSavedIds([])
    setFinishing(false)
    setError(null)
    setLoadError(null)
    setLoadingSaved(true)

    let cancelled = false

    void api.gameMonsters
      .list()
      .then((entries) => {
        if (cancelled) return

        const ids = entries.map((entry) => entry.id)
        setSavedIds(ids)
        // Монстры, уже сохранённые в библиотеке, отмечены всегда.
        setKeepIds(game.monsters.filter((monster) => ids.includes(monster.id)).map((m) => m.id))
      })
      .catch((caught: unknown) => {
        if (!cancelled) setLoadError(errorMessage(caught))
      })
      .finally(() => {
        if (!cancelled) setLoadingSaved(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, game])

  function isSaved(id: string): boolean {
    return savedIds.includes(id)
  }

  function toggleMonster(id: string): void {
    if (isSaved(id)) return

    setKeepIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  async function confirm(): Promise<void> {
    if (finishing) return

    setFinishing(true)
    setError(null)

    try {
      await onFinish(keepIds)
    } catch (caught) {
      setError(errorMessage(caught))
      setFinishing(false)
    }
  }

  const total = game?.monsters.length ?? 0
  const kept = keepIds.length

  return (
    <Modal
      open={open}
      title={m.games.finish.title}
      description={game ? fill(m.games.finish.description, { name: game.name }) : undefined}
      size="lg"
      onClose={onClose}
      initialFocusRef={cancelRef}
      footer={
        <>
          <button ref={cancelRef} type="button" className="button" onClick={onClose} disabled={finishing}>
            {m.games.finish.cancel}
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => void confirm()}
            disabled={finishing || loadingSaved || Boolean(loadError)}
          >
            {finishing ? m.games.finish.finishing : m.games.finish.submit}
          </button>
        </>
      }
    >
      <div className="finish-game">
        {error ? <p className="notice notice--error">{error}</p> : null}
        {loadError ? (
          <p className="notice notice--error">
            {fill(m.games.finish.loadError, { error: loadError })}
          </p>
        ) : null}

        <p className="notice">{m.games.finish.notice}</p>

        {loadingSaved ? (
          <p className="muted">{m.games.finish.checkingSaved}</p>
        ) : null}

        {total > 0 ? (
          <>
            <div className="finish-game__summary">
              <span>{plural(total, m.games.finish.monstersInGame)}</span>
              <span>
                {kept > 0
                  ? fill(m.games.finish.keeping, { count: kept })
                  : m.games.finish.keepingNone}
              </span>
            </div>

            <div className="finish-monster-list">
              {game?.monsters.map((monster) => {
                const locked = isSaved(monster.id)
                const checked = locked || keepIds.includes(monster.id)

                return (
                  <label
                    key={monster.id}
                    className={[
                      'finish-monster-row',
                      checked ? 'finish-monster-row--on' : '',
                      locked ? 'finish-monster-row--locked' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    title={locked ? m.games.finish.lockedTitle : undefined}
                  >
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={checked}
                      disabled={locked || loadingSaved}
                      onChange={() => toggleMonster(monster.id)}
                    />

                    <span className="finish-monster-row__main">
                      <span className="finish-monster-row__name">{monster.name}</span>
                      <span className="finish-monster-row__meta">
                        {fill(m.games.monsterStats, {
                          cr: formatChallengeRating(monster.challengeRating),
                          ac: monster.armorClass,
                          hp: monster.hitPoints
                        })}
                      </span>
                    </span>

                    <span className="finish-monster-row__state">
                      {locked ? (
                        <>
                          <IconLock width={11} height={11} />
                          {m.games.finish.savedState}
                        </>
                      ) : checked ? (
                        m.games.finish.keptState
                      ) : (
                        m.games.finish.notSavedState
                      )}
                    </span>
                  </label>
                )
              })}
            </div>
          </>
        ) : (
          <p className="muted">{m.games.finish.noMonsters}</p>
        )}

        <p className="game-editor__hint">{m.games.finish.hint}</p>
      </div>
    </Modal>
  )
}
