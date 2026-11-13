import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import type { Game } from '@shared/game'
import { formatChallengeRating } from '@shared/domain'
import { api, errorMessage } from '@renderer/lib/api'
import { pluralize } from '@renderer/lib/format'
import { Modal } from '../ui/Modal'
import { IconLock } from '../ui/icons'

interface GameDeleteModalProps {
  open: boolean
  game: Game | null
  onClose: () => void
  /** Ошибки пробрасываются в модалку, чтобы она осталась открытой. */
  onConfirm: (keepMonsterIds: string[]) => Promise<void>
}

/**
 * Удаление игры с выбором монстров, которых нужно сохранить.
 * Отмеченные уходят в список игровых монстров, остальные удаляются вместе с игрой.
 */
export function GameDeleteModal({
  open,
  game,
  onClose,
  onConfirm
}: GameDeleteModalProps): JSX.Element {
  const [keepIds, setKeepIds] = useState<string[]>([])
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [loadingSaved, setLoadingSaved] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open || !game) return

    setKeepIds([])
    setSavedIds([])
    setDeleting(false)
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
    if (deleting) return

    setDeleting(true)
    setError(null)

    try {
      await onConfirm(keepIds)
    } catch (caught) {
      setError(errorMessage(caught))
      setDeleting(false)
    }
  }

  const total = game?.monsters.length ?? 0
  const kept = keepIds.length

  return (
    <Modal
      open={open}
      title="Удаление игры"
      description={
        game
          ? `«${game.name}» будет удалена. Отметьте монстров, которых хотите сохранить для следующих игр.`
          : undefined
      }
      tone="danger"
      size="lg"
      onClose={onClose}
      initialFocusRef={cancelRef}
      footer={
        <>
          <button ref={cancelRef} type="button" className="button" onClick={onClose} disabled={deleting}>
            Отмена
          </button>
          <button
            type="button"
            className="button button--danger-solid"
            onClick={() => void confirm()}
            disabled={deleting || loadingSaved || Boolean(loadError)}
          >
            {deleting ? 'Удаляем…' : 'Удалить игру'}
          </button>
        </>
      }
    >
      <div className="delete-game">
        {error ? <p className="notice notice--error">{error}</p> : null}
        {loadError ? (
          <p className="notice notice--error">
            Не удалось проверить сохранённых монстров: {loadError}
          </p>
        ) : null}

        <p className="notice">
          Монстры без отметки будут удалены вместе с игрой безвозвратно. Отмеченные попадут
          в список игровых монстров — в бестиарий они не добавляются. Монстры, которые уже есть
          в списке сохранённых, отмечены всегда: снять отметку нельзя, удалить их можно только
          на экране сохранённых монстров.
        </p>

        {loadingSaved ? (
          <p className="muted">Проверяем, какие монстры уже сохранены…</p>
        ) : null}

        {total > 0 ? (
          <>
            <div className="delete-game__summary">
              <span>
                {total} {pluralize(total, 'монстр', 'монстра', 'монстров')} в игре
              </span>
              <span>
                {kept > 0
                  ? `сохраняем ${kept}`
                  : 'не сохраняем ни одного'}
              </span>
            </div>

            <div className="delete-monster-list">
              {game?.monsters.map((monster) => {
                const locked = isSaved(monster.id)
                const checked = locked || keepIds.includes(monster.id)

                return (
                  <label
                    key={monster.id}
                    className={[
                      'delete-monster-row',
                      checked ? 'delete-monster-row--on' : '',
                      locked ? 'delete-monster-row--locked' : ''
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

                    <span className="delete-monster-row__main">
                      <span className="delete-monster-row__name">{monster.name}</span>
                      <span className="delete-monster-row__meta">
                        КО {formatChallengeRating(monster.challengeRating)} · КЗ{' '}
                        {monster.armorClass} · ХП {monster.hitPoints}
                      </span>
                    </span>

                    <span className="delete-monster-row__state">
                      {locked ? (
                        <>
                          <IconLock width={11} height={11} />
                          сохранён
                        </>
                      ) : checked ? (
                        'остаётся'
                      ) : (
                        'удалится'
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
          Игровые монстры хранятся отдельно и не меняют бестиарий.
        </p>
      </div>
    </Modal>
  )
}
