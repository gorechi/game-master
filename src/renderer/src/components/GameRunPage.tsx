import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, JSX } from 'react'
import type { Game } from '@shared/game'
import type { GameMap } from '@shared/map'
import { api, errorMessage } from '@renderer/lib/api'
import { GameFinishModal } from './games/GameFinishModal'
import { RunMap } from './maps/RunMap'
import { IconArrowLeft, IconFlag, IconSwords } from './ui/icons'

interface GameRunPageProps {
  gameId: string
  onBack: () => void
}

/** Режим проведения: карта, заметки и кнопка схватки. */
export function GameRunPage({ gameId, onBack }: GameRunPageProps): JSX.Element {
  const [game, setGame] = useState<Game | null | undefined>(undefined)
  const [maps, setMaps] = useState<GameMap[]>([])
  const [notes, setNotes] = useState('')
  const [combatFlash, setCombatFlash] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const notesRef = useRef(notes)
  notesRef.current = notes

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const games = await api.games.list()
      const loaded = games.find((item) => item.id === gameId) ?? null
      const nextMaps = loaded ? await api.maps.list(loaded.realmId) : []

      if (cancelled) return

      setGame(loaded)
      setMaps(nextMaps)
      setNotes(loaded?.notes ?? '')
    })().catch((caught: unknown) => {
      if (!cancelled) setError(errorMessage(caught))
    })

    return () => {
      cancelled = true
    }
  }, [gameId])

  useEffect(() => {
    if (!combatFlash) return

    const timer = window.setTimeout(() => setCombatFlash(false), 2600)
    return () => window.clearTimeout(timer)
  }, [combatFlash])

  async function persistNotes(value: string): Promise<void> {
    if (!game || game.status === 'finished' || value === game.notes) return

    try {
      const updated = await api.games.update({ ...game, notes: value })
      setGame(updated)
      setError(null)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  useEffect(() => {
    if (!game || game.status === 'finished' || notes === game.notes) return

    const timer = window.setTimeout(() => {
      void persistNotes(notesRef.current)
    }, 700)

    return () => window.clearTimeout(timer)
  }, [notes, game])

  async function finishGame(keepMonsterIds: string[]): Promise<void> {
    if (!game) return

    await persistNotes(notesRef.current)
    const updated = await api.games.finish(game.id, keepMonsterIds)
    setGame(updated)
    setConfirmFinish(false)
    onBack()
  }

  function handleBack(): void {
    void persistNotes(notesRef.current)
    onBack()
  }

  const map = game?.mapId ? (maps.find((item) => item.id === game.mapId) ?? null) : null
  const linkedMapNames = Object.fromEntries(maps.map((item) => [item.id, item.name]))

  return (
    <main className="run-screen">
      {game === null ? (
        <div className="run-message">
          <p>Игра не найдена — возможно, запись удалили.</p>
          <button type="button" className="button" onClick={handleBack}>
            Вернуться
          </button>
        </div>
      ) : game === undefined ? (
        <div className="run-message run-message--muted">Загружаем игру…</div>
      ) : (
        <>
          <section className="run-screen__map">
            <div className="run-map-tools">
              <button
                type="button"
                className="icon-button run-map-tool"
                title="Вернуться к играм"
                aria-label="Вернуться к играм"
                onClick={handleBack}
              >
                <IconArrowLeft />
              </button>

              {game.status === 'running' || game.status === 'paused' ? (
                <button
                  type="button"
                  className="icon-button run-map-tool run-map-tool--finish"
                  title="Закончить игру"
                  aria-label="Закончить игру"
                  onClick={() => setConfirmFinish(true)}
                >
                  <IconFlag />
                </button>
              ) : null}
            </div>

            {map ? (
              <RunMap map={map} linkedMapNames={linkedMapNames} />
            ) : (
              <div className="run-map-empty">
                <p>Карта не выбрана</p>
              </div>
            )}
          </section>

          <section className="run-screen__bottom">
            <textarea
              className="run-notes__input"
              value={notes}
              readOnly={game.status === 'finished'}
              placeholder="Заметки…"
              spellCheck={false}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                setNotes(event.target.value)
              }
              onBlur={() => void persistNotes(notes)}
            />

            <button
              type="button"
              className={`combat-button${combatFlash ? ' combat-button--flash' : ''}`}
              disabled={game.status !== 'running'}
              title="Схватка"
              onClick={() => setCombatFlash(true)}
            >
              <span className="combat-button__sheen" aria-hidden="true" />
              <span className="combat-button__icon" aria-hidden="true">
                <IconSwords width={30} height={30} />
              </span>
              <span className="combat-button__label">Схватка</span>
            </button>
          </section>

          {error ? (
            <p className="run-screen__error notice notice--error">{error}</p>
          ) : null}
        </>
      )}

      <GameFinishModal
        open={confirmFinish}
        game={game ?? null}
        onClose={() => setConfirmFinish(false)}
        onFinish={finishGame}
      />
    </main>
  )
}
