import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { Game } from '@shared/game'
import { api, errorMessage } from '@renderer/lib/api'
import { formatDate, pluralize } from '@renderer/lib/format'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { IconPencil, IconPlay, IconPlus, IconTrash } from './ui/icons'
import { GameFormModal } from './games/GameFormModal'

interface GamesPageProps {
  onOpenGame: (gameId: string) => void
}

/** Основной раздел: игры, которые мастер готовит или проводит. */
export function GamesPage({ onOpenGame }: GamesPageProps): JSX.Element {
  const [games, setGames] = useState<Game[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Game | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Game | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setGames(await api.games.list())
      setError(null)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function confirmDelete(): Promise<void> {
    if (!deleting) return

    try {
      await api.games.remove(deleting.id)
      setDeleting(null)
      await refresh()
    } catch (caught) {
      setError(errorMessage(caught))
      setDeleting(null)
    }
  }

  return (
    <main className="page">
      <div className="page__inner">
        <header className="page-head">
          <div>
            <h1>Игры</h1>
            <p className="muted">
              Партии, которые вы готовите или проводите. Это основная сущность приложения.
            </p>
          </div>
          <button className="button button--primary" onClick={() => setEditing('new')}>
            <IconPlus width={16} height={16} />
            Создать игру
          </button>
        </header>

        {error ? <p className="notice notice--error">{error}</p> : null}

        {games === null ? (
          <p className="muted">Загружаем игры…</p>
        ) : games.length === 0 ? (
          <div className="empty empty--action">
            <p>Пока ни одной игры. Создайте первую — с неё начинается подготовка к партии.</p>
            <button className="button" onClick={() => setEditing('new')}>
              Создать игру
            </button>
          </div>
        ) : (
          <>
            <p className="list-caption">
              {games.length} {pluralize(games.length, 'игра', 'игры', 'игр')}
            </p>

            <ul className="game-list">
              {games.map((game) => (
                <li className="game-card" key={game.id}>
                  <span className="game-card__sigil" aria-hidden="true">
                    <IconPlay width={22} height={22} />
                  </span>

                  <div className="game-card__identity">
                    <h3 className="game-card__name">{game.name}</h3>
                    <span className="game-card__meta">Создана {formatDate(game.createdAt)}</span>
                  </div>

                  <div className="game-card__actions">
                    <button
                      type="button"
                      className="button button--tiny button--primary"
                      onClick={() => onOpenGame(game.id)}
                    >
                      Провести
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      title="Редактировать"
                      aria-label={`Редактировать игру ${game.name}`}
                      onClick={() => setEditing(game)}
                    >
                      <IconPencil />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button--danger"
                      title="Удалить"
                      aria-label={`Удалить игру ${game.name}`}
                      onClick={() => setDeleting(game)}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <GameFormModal
        open={editing !== null}
        game={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          void refresh()
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Удалить игру?"
        description={
          deleting
            ? `«${deleting.name}» будет удалена. Это действие нельзя отменить.`
            : undefined
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  )
}
