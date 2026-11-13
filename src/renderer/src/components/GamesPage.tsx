import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { Game } from '@shared/game'
import { gameStatusLabels, isGameDeletable } from '@shared/gameStatus'
import { api, errorMessage } from '@renderer/lib/api'
import { formatDate, pluralize } from '@renderer/lib/format'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { IconPencil, IconPlay, IconPlus, IconTrash } from './ui/icons'
import { GameFormModal } from './games/GameFormModal'

interface GamesPageProps {
  onOpenGame: (gameId: string) => void
}

type GameFormState =
  | { mode: 'create'; initialCharacterIds?: string[]; initialMapId?: string | null }
  | { mode: 'edit'; game: Game }
  | { mode: 'view'; game: Game }

/** Основной раздел: игры, которые мастер готовит или проводит. */
export function GamesPage({ onOpenGame }: GamesPageProps): JSX.Element {
  const [games, setGames] = useState<Game[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<GameFormState | null>(null)
  const [confirmingGame, setConfirmingGame] = useState<Game | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

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

  function requestDelete(game: Game): void {
    setNotice(null)

    if (!isGameDeletable(game.status)) {
      setError('Идущую игру нельзя удалить — сначала завершите её')
      return
    }

    // Монстры сохраняются при завершении игры, поэтому удаление — простое подтверждение.
    setConfirmingGame(game)
  }

  async function startGame(game: Game): Promise<void> {
    try {
      if (game.status === 'new' || game.status === 'paused') {
        await api.games.setStatus(game.id, 'running')
      }
      onOpenGame(game.id)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  async function confirmSimpleDelete(): Promise<void> {
    if (!confirmingGame) return

    try {
      await api.games.remove(confirmingGame.id)
      const monsters = confirmingGame.monsters.length
      setNotice(
        monsters > 0
          ? `Игра «${confirmingGame.name}» удалена. Вместе с ней удалено ${monsters} ${pluralize(
              monsters,
              'монстр',
              'монстра',
              'монстров'
            )}.`
          : `Игра «${confirmingGame.name}» удалена.`
      )
      setConfirmingGame(null)
      await refresh()
    } catch (caught) {
      setError(errorMessage(caught))
      setConfirmingGame(null)
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
          <button
            className="button button--primary"
            onClick={() => setForm({ mode: 'create' })}
          >
            <IconPlus width={16} height={16} />
            Создать игру
          </button>
        </header>

        {error ? <p className="notice notice--error">{error}</p> : null}
        {notice ? <p className="notice notice--success">{notice}</p> : null}

        {games === null ? (
          <p className="muted">Загружаем игры…</p>
        ) : games.length === 0 ? (
          <div className="empty empty--action">
            <p>Пока ни одной игры. Создайте первую — с неё начинается подготовка к партии.</p>
            <button className="button" onClick={() => setForm({ mode: 'create' })}>
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
                    <div className="game-card__title-row">
                      <h3 className="game-card__name">{game.name}</h3>
                      <span className={`game-status game-status--${game.status}`}>
                        {gameStatusLabels[game.status]}
                      </span>
                    </div>
                    <span className="game-card__meta">Создана {formatDate(game.createdAt)}</span>
                  </div>

                  <div className="game-card__actions">
                    {game.status === 'finished' ? (
                      <>
                        <button
                          type="button"
                          className="button button--tiny"
                          onClick={() => setForm({ mode: 'view', game })}
                        >
                          Просмотр
                        </button>
                        <button
                          type="button"
                          className="button button--tiny button--primary"
                          onClick={() =>
                            setForm({
                              mode: 'create',
                              initialCharacterIds: game.characterIds,
                              initialMapId: game.mapId
                            })
                          }
                        >
                          Продолжение
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="button button--tiny button--primary"
                          onClick={() => void startGame(game)}
                        >
                          {game.status === 'new'
                            ? 'Начать'
                            : game.status === 'paused'
                              ? 'Продолжить'
                              : 'Открыть'}
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          title="Редактировать"
                          aria-label={`Редактировать игру ${game.name}`}
                          onClick={() => setForm({ mode: 'edit', game })}
                        >
                          <IconPencil />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="icon-button icon-button--danger"
                      title={
                        isGameDeletable(game.status)
                          ? 'Удалить'
                          : 'Идущую игру нельзя удалить — сначала завершите'
                      }
                      aria-label={`Удалить игру ${game.name}`}
                      disabled={!isGameDeletable(game.status)}
                      onClick={() => requestDelete(game)}
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
        open={form !== null}
        game={form && form.mode !== 'create' ? form.game : null}
        initialCharacterIds={form?.mode === 'create' ? form.initialCharacterIds : undefined}
        initialMapId={form?.mode === 'create' ? form.initialMapId : undefined}
        readOnly={form?.mode === 'view'}
        onClose={() => setForm(null)}
        onSaved={() => {
          setForm(null)
          void refresh()
        }}
      />

      <ConfirmDialog
        open={confirmingGame !== null}
        title="Удалить игру?"
        description={
          confirmingGame
            ? [
                `«${confirmingGame.name}» будет удалена.`,
                confirmingGame.monsters.length > 0
                  ? `Вместе с ней будут удалены ${confirmingGame.monsters.length} ${pluralize(
                      confirmingGame.monsters.length,
                      'монстр',
                      'монстра',
                      'монстров'
                    )} — сохранение доступно при завершении игры.`
                  : null,
                'Это действие нельзя отменить.'
              ]
                .filter(Boolean)
                .join(' ')
            : undefined
        }
        onCancel={() => setConfirmingGame(null)}
        onConfirm={() => void confirmSimpleDelete()}
      />
    </main>
  )
}
