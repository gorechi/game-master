import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { Game } from '@shared/game'
import type { Realm } from '@shared/realm'
import { isGameDeletable } from '@shared/gameStatus'
import { api, errorMessage } from '@renderer/lib/api'
import { useI18n } from '@renderer/i18n/LocaleProvider'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { IconPencil, IconPlay, IconPlus, IconTrash } from './ui/icons'
import { GameFormModal } from './games/GameFormModal'

interface GamesPageProps {
  realms: readonly Realm[]
  onOpenGame: (gameId: string) => void
}

type GameFormState =
  | {
      mode: 'create'
      initialRealmId?: string
      initialCharacterIds?: string[]
      initialMapId?: string | null
    }
  | { mode: 'edit'; game: Game }
  | { mode: 'view'; game: Game }

/** Основной раздел: игры, которые мастер готовит или проводит. */
export function GamesPage({ realms, onOpenGame }: GamesPageProps): JSX.Element {
  const { messages: m, fill, plural, formatDate } = useI18n()
  const [games, setGames] = useState<Game[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<GameFormState | null>(null)
  const [confirmingGame, setConfirmingGame] = useState<Game | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const realmNames = new Map(realms.map((realm) => [realm.id, realm.name]))

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
      setError(m.games.page.blockedError)
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
          ? fill(m.games.page.deletedWithMonsters, {
              name: confirmingGame.name,
              monsters: plural(monsters, m.games.monstersCount)
            })
          : fill(m.games.page.deleted, { name: confirmingGame.name })
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
            <h1>{m.games.page.title}</h1>
            <p className="muted">{m.games.page.description}</p>
          </div>
          <button
            className="button button--primary"
            onClick={() => setForm({ mode: 'create' })}
          >
            <IconPlus width={16} height={16} />
            {m.games.page.create}
          </button>
        </header>

        {error ? <p className="notice notice--error">{error}</p> : null}
        {notice ? <p className="notice notice--success">{notice}</p> : null}

        {games === null ? (
          <p className="muted">{m.games.page.loading}</p>
        ) : games.length === 0 ? (
          <div className="empty empty--action">
            <p>{m.games.page.empty}</p>
            <button className="button" onClick={() => setForm({ mode: 'create' })}>
              {m.games.page.create}
            </button>
          </div>
        ) : (
          <>
            <p className="list-caption">{plural(games.length, m.games.gamesCount)}</p>

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
                        {m.games.statuses[game.status]}
                      </span>
                    </div>
                    <span className="game-card__meta">
                      <span className="game-card__realm">
                        {realmNames.get(game.realmId) ?? m.games.page.noRealm}
                      </span>
                      {' · '}
                      {fill(m.games.page.created, { date: formatDate(game.createdAt) })}
                    </span>
                  </div>

                  <div className="game-card__actions">
                    {game.status === 'finished' ? (
                      <>
                        <button
                          type="button"
                          className="button button--tiny"
                          onClick={() => setForm({ mode: 'view', game })}
                        >
                          {m.games.page.view}
                        </button>
                        <button
                          type="button"
                          className="button button--tiny button--primary"
                          onClick={() =>
                            setForm({
                              mode: 'create',
                              initialRealmId: game.realmId,
                              initialCharacterIds: game.characterIds,
                              initialMapId: game.mapId
                            })
                          }
                        >
                          {m.games.page.continuation}
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
                            ? m.games.page.start
                            : game.status === 'paused'
                              ? m.games.page.resume
                              : m.games.page.open}
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          title={m.games.page.edit}
                          aria-label={fill(m.games.page.editAria, { name: game.name })}
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
                          ? m.games.page.delete
                          : m.games.page.blockedTitle
                      }
                      aria-label={fill(m.games.page.deleteAria, { name: game.name })}
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
        realms={realms}
        initialRealmId={form?.mode === 'create' ? form.initialRealmId : undefined}
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
        title={m.games.page.deleteTitle}
        description={
          confirmingGame
            ? [
                fill(m.games.page.deleteDescription, { name: confirmingGame.name }),
                confirmingGame.monsters.length > 0
                  ? fill(m.games.page.deleteMonsters, {
                      monsters: plural(
                        confirmingGame.monsters.length,
                        m.games.monstersCount
                      )
                    })
                  : null,
                m.games.page.deleteIrreversible
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
