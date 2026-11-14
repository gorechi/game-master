import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import type { Game } from '@shared/game'
import { formatChallengeRating } from '@shared/domain'
import { api, errorMessage } from '@renderer/lib/api'
import { pluralize } from '@renderer/lib/format'
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
      title="Завершение игры"
      description={
        game
          ? `«${game.name}» будет переведена в статус «Закончена». Отметьте монстров, которых хотите сохранить для следующих игр.`
          : undefined
      }
      size="lg"
      onClose={onClose}
      initialFocusRef={cancelRef}
      footer={
        <>
          <button ref={cancelRef} type="button" className="button" onClick={onClose} disabled={finishing}>
            Отмена
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => void confirm()}
            disabled={finishing || loadingSaved || Boolean(loadError)}
          >
            {finishing ? 'Завершаем…' : 'Закончить игру'}
          </button>
        </>
      }
    >
      <div className="finish-game">
        {error ? <p className="notice notice--error">{error}</p> : null}
        {loadError ? (
          <p className="notice notice--error">
            Не удалось проверить сохранённых монстров: {loadError}
          </p>
        ) : null}

        <p className="notice">
          Отмеченные монстры попадут в список уникальных существ — в бестиарий они не добавляются.
          Неотмеченные останутся в завершённой игре и исчезнут вместе с ней. Монстры, которые уже
          есть в списке сохранённых, отмечены всегда: снять отметку нельзя, удалить их можно только
          на экране уникальных существ.
        </p>

        {loadingSaved ? (
          <p className="muted">Проверяем, какие монстры уже сохранены…</p>
        ) : null}

        {total > 0 ? (
          <>
            <div className="finish-game__summary">
              <span>
                {total} {pluralize(total, 'монстр', 'монстра', 'монстров')} в игре
              </span>
              <span>{kept > 0 ? `сохраняем ${kept}` : 'не сохраняем ни одного'}</span>
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
                    title={
                      locked
                        ? 'Монстр уже в списке сохранённых — снять отметку нельзя'
                        : undefined
                    }
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
                        КО {formatChallengeRating(monster.challengeRating)} · КЗ{' '}
                        {monster.armorClass} · ХП {monster.hitPoints}
                      </span>
                    </span>

                    <span className="finish-monster-row__state">
                      {locked ? (
                        <>
                          <IconLock width={11} height={11} />
                          сохранён
                        </>
                      ) : checked ? (
                        'остаётся'
                      ) : (
                        'не сохранится'
                      )}
                    </span>
                  </label>
                )
              })}
            </div>
          </>
        ) : (
          <p className="muted">В этой игре не было монстров.</p>
        )}

        <p className="game-editor__hint">
          Уникальные существа хранятся отдельно и не меняют бестиарий.
        </p>
      </div>
    </Modal>
  )
}
