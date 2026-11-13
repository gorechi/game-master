import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { Game } from '@shared/game'
import { gameStatusLabels, type GameStatus } from '@shared/gameStatus'
import { api, errorMessage } from '@renderer/lib/api'
import { formatDate } from '@renderer/lib/format'
import { GameFinishModal } from './games/GameFinishModal'
import { IconPlay } from './ui/icons'

interface GameRunPageProps {
  gameId: string
  onBack: () => void
}

/** Заготовка режима проведения игры и управление её статусом. */
export function GameRunPage({ gameId, onBack }: GameRunPageProps): JSX.Element {
  const [game, setGame] = useState<Game | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)

  useEffect(() => {
    let cancelled = false

    void api.games
      .list()
      .then((games) => {
        if (cancelled) return
        setGame(games.find((item) => item.id === gameId) ?? null)
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        setError(errorMessage(caught))
      })

    return () => {
      cancelled = true
    }
  }, [gameId])

  async function changeStatus(status: GameStatus): Promise<void> {
    if (!game || updating) return

    setUpdating(true)
    setError(null)

    try {
      const updated = await api.games.setStatus(game.id, status)
      setGame(updated)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setUpdating(false)
    }
  }

  async function finishGame(keepMonsterIds: string[]): Promise<void> {
    if (!game) return

    setUpdating(true)

    try {
      const updated = await api.games.finish(game.id, keepMonsterIds)
      setGame(updated)
      setConfirmFinish(false)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <main className="page">
      <div className="page__inner">
        <div className="page-block">
          <button type="button" className="button button--ghost button--tiny page-back" onClick={onBack}>
            ← Игры
          </button>

          <header className="page-head">
            <div>
              <p className="page-kicker">Режим проведения</p>
              <div className="run-title-row">
                <h1>{game ? game.name : 'Игра'}</h1>
                {game ? (
                  <span className={`game-status game-status--${game.status}`}>
                    {gameStatusLabels[game.status]}
                  </span>
                ) : null}
              </div>
              <p className="muted">
                {game ? `Создана ${formatDate(game.createdAt)}` : 'Загружаем игру…'}
              </p>
            </div>

            {game ? (
              <div className="run-actions">
                {game.status === 'new' ? (
                  <button
                    className="button button--primary"
                    onClick={() => void changeStatus('running')}
                    disabled={updating}
                  >
                    Начать
                  </button>
                ) : null}

                {game.status === 'running' ? (
                  <button
                    className="button"
                    onClick={() => void changeStatus('paused')}
                    disabled={updating}
                  >
                    Пауза
                  </button>
                ) : null}

                {game.status === 'paused' ? (
                  <button
                    className="button button--primary"
                    onClick={() => void changeStatus('running')}
                    disabled={updating}
                  >
                    Продолжить
                  </button>
                ) : null}

                {game.status === 'running' || game.status === 'paused' ? (
                  <button
                    className="button button--danger"
                    onClick={() => setConfirmFinish(true)}
                    disabled={updating}
                  >
                    Закончить игру
                  </button>
                ) : null}
              </div>
            ) : null}
          </header>
        </div>

        {error ? <p className="notice notice--error">{error}</p> : null}

        {game === null ? (
          <div className="notice notice--action">
            <span>Игра не найдена — возможно, запись удалили.</span>
            <button className="button button--tiny" onClick={onBack}>
              Вернуться
            </button>
          </div>
        ) : (
          <>
            {game?.status === 'finished' ? (
              <p className="notice">Игра завершена — редактирование недоступно.</p>
            ) : null}

            <section className="run-placeholder">
              <span className="run-placeholder__icon" aria-hidden="true">
                <IconPlay width={44} height={44} />
              </span>
              <h2>{game?.status === 'finished' ? 'Игра завершена' : 'Здесь будет проведение игры'}</h2>
              <p>
                {game?.status === 'finished'
                  ? 'Режим проведения закрыт. Завершённую игру нельзя редактировать, но можно удалить со страницы «Игры».'
                  : 'Инициатива, участники, заметки и броски появятся на следующих шагах. Пока это заготовка экрана.'}
              </p>
            </section>
          </>
        )}
      </div>

      <GameFinishModal
        open={confirmFinish}
        game={game ?? null}
        onClose={() => setConfirmFinish(false)}
        onFinish={finishGame}
      />
    </main>
  )
}
