import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, JSX } from 'react'
import type { Game } from '@shared/game'
import type { GameMap } from '@shared/map'
import type { PlaceType } from '@shared/placeType'
import { api, errorMessage } from '@renderer/lib/api'
import { GameFinishModal } from './games/GameFinishModal'
import { CombatModal, type CombatStart } from './games/CombatModal'
import { CombatScreen } from './games/CombatScreen'
import { RunMap } from './maps/RunMap'
import { IconArrowLeft, IconCollapse, IconExpand, IconFlag, IconSwords } from './ui/icons'

interface GameRunPageProps {
  gameId: string
  onBack: () => void
}

/** Режим проведения: карта, заметки и кнопка схватки. */
export function GameRunPage({ gameId, onBack }: GameRunPageProps): JSX.Element {
  const [game, setGame] = useState<Game | null | undefined>(undefined)
  const [maps, setMaps] = useState<GameMap[]>([])
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>([])
  const [notes, setNotes] = useState('')
  const [notesExpanded, setNotesExpanded] = useState(false)
  const [combatOpen, setCombatOpen] = useState(false)
  const [combat, setCombat] = useState<CombatStart | null>(null)
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
      const nextPlaceTypes = loaded ? await api.placeTypes.list(loaded.realmId) : []

      if (cancelled) return

      setGame(loaded)
      setMaps(nextMaps)
      setPlaceTypes(nextPlaceTypes)
      setNotes(loaded?.notes ?? '')
    })().catch((caught: unknown) => {
      if (!cancelled) setError(errorMessage(caught))
    })

    return () => {
      cancelled = true
    }
  }, [gameId])

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

  function collapseNotes(): void {
    setNotesExpanded(false)
    void persistNotes(notesRef.current)
  }

  useEffect(() => {
    if (!notesExpanded) return

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setNotesExpanded(false)
      void persistNotes(notesRef.current)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [notesExpanded])

  async function saveMonsterHp(monsterId: string, hitPoints: number): Promise<void> {
    if (!game) return

    const updated = await api.games.update({
      ...game,
      monsters: game.monsters.map((monster) =>
        monster.id === monsterId ? { ...monster, hitPoints } : monster
      )
    })

    setGame(updated)
    setError(null)
  }

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

  if (combat) {
    return (
      <CombatScreen
        initial={combat}
        onFinish={() => setCombat(null)}
        onMonsterHpChange={saveMonsterHp}
      />
    )
  }

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
              <RunMap map={map} placeTypes={placeTypes} linkedMapNames={linkedMapNames} />
            ) : (
              <div className="run-map-empty">
                <p>Карта не выбрана</p>
              </div>
            )}
          </section>

          <section className="run-screen__bottom">
            <div className="run-notes">
              <button
                type="button"
                className="run-notes__expand"
                title="Развернуть заметки поверх карты"
                aria-label="Развернуть заметки поверх карты"
                onClick={() => setNotesExpanded(true)}
              >
                <IconExpand width={14} height={14} />
                Развернуть
              </button>

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
            </div>

            <button
              type="button"
              className="combat-button"
              disabled={game.status !== 'running'}
              title="Схватка"
              onClick={() => setCombatOpen(true)}
            >
              <span className="combat-button__sheen" aria-hidden="true" />
              <span className="combat-button__icon" aria-hidden="true">
                <IconSwords width={30} height={30} />
              </span>
              <span className="combat-button__label">Схватка</span>
            </button>
          </section>

          {notesExpanded ? (
            <section
              className="run-notes-overlay"
              role="dialog"
              aria-modal="true"
              aria-label="Заметки мастера"
            >
              <header className="run-notes-overlay__head">
                <div>
                  <p className="page-kicker">Заметки</p>
                  <h2>Заметки мастера</h2>
                </div>
                <button
                  type="button"
                  className="button button--tiny"
                  onClick={collapseNotes}
                >
                  <IconCollapse width={14} height={14} />
                  Свернуть
                </button>
              </header>

              <textarea
                className="run-notes-overlay__input"
                value={notes}
                readOnly={game.status === 'finished'}
                placeholder="Заметки…"
                spellCheck={false}
                autoFocus
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setNotes(event.target.value)
                }
                onBlur={() => void persistNotes(notes)}
              />
            </section>
          ) : null}

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

      {game ? (
        <CombatModal
          open={combatOpen}
          game={game}
          onClose={() => setCombatOpen(false)}
          onStart={(start) => {
            setCombat(start)
            setCombatOpen(false)
          }}
        />
      ) : null}
    </main>
  )
}
