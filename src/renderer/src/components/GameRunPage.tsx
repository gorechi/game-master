import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { Game } from '@shared/game'
import { api, errorMessage } from '@renderer/lib/api'
import { formatDate } from '@renderer/lib/format'
import { IconPlay } from './ui/icons'

interface GameRunPageProps {
  gameId: string
  onBack: () => void
}

/** Заготовка режима проведения игры. */
export function GameRunPage({ gameId, onBack }: GameRunPageProps): JSX.Element {
  const [game, setGame] = useState<Game | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

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
              <h1>{game ? game.name : 'Игра'}</h1>
              <p className="muted">
                {game ? `Создана ${formatDate(game.createdAt)}` : 'Загружаем игру…'}
              </p>
            </div>
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
          <section className="run-placeholder">
            <span className="run-placeholder__icon" aria-hidden="true">
              <IconPlay width={44} height={44} />
            </span>
            <h2>Здесь будет проведение игры</h2>
            <p>
              Инициатива, участники, заметки и броски появятся на следующих шагах. Пока это
              заготовка экрана — игра уже открывается в режиме проведения.
            </p>
          </section>
        )}
      </div>
    </main>
  )
}
