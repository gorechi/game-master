import { useCallback, useEffect, useMemo, useState } from 'react'
import type { JSX } from 'react'
import type { Player } from '@shared/player'
import type { CharacterProfile } from '@shared/characterProfile'
import { api, errorMessage } from '@renderer/lib/api'
import { pluralize } from '@renderer/lib/format'
import { CharacterCard } from './character/CharacterCard'
import { CharacterFormModal } from './character/CharacterFormModal'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { IconPlus } from './ui/icons'

interface CharactersPageProps {
  onOpenPlayers: () => void
  onOpenPlayer: (playerId: string) => void
}

/** Все персонажи приложения: у каждого игрока их может быть несколько. */
export function CharactersPage({ onOpenPlayers, onOpenPlayer }: CharactersPageProps): JSX.Element {
  const [players, setPlayers] = useState<Player[]>([])
  const [characters, setCharacters] = useState<CharacterProfile[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<CharacterProfile | 'new' | null>(null)
  const [deleting, setDeleting] = useState<CharacterProfile | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const [nextPlayers, nextCharacters] = await Promise.all([
        api.players.list(),
        api.characters.list()
      ])
      setPlayers(nextPlayers)
      setCharacters(nextCharacters)
      setError(null)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const playerById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players]
  )

  async function confirmDelete(): Promise<void> {
    if (!deleting) return

    try {
      await api.characters.remove(deleting.id)
      setDeleting(null)
      await refresh()
    } catch (caught) {
      setError(errorMessage(caught))
      setDeleting(null)
    }
  }

  const noPlayers = characters !== null && players.length === 0

  return (
    <main className="page">
      <div className="page__inner">
        <header className="page-head">
          <div>
            <h1>Персонажи</h1>
            <p className="muted">
              Герои игроков: у одного человека может быть несколько персонажей.
            </p>
          </div>
          <button
            className="button button--primary"
            onClick={() => setEditing('new')}
            disabled={players.length === 0}
          >
            <IconPlus width={16} height={16} />
            Добавить персонажа
          </button>
        </header>

        {error ? <p className="notice notice--error">{error}</p> : null}

        {noPlayers ? (
          <div className="notice notice--action">
            <span>Сначала добавьте хотя бы одного игрока — персонаж должен за кем-то числиться.</span>
            <button className="button button--tiny" onClick={onOpenPlayers}>
              Перейти к игрокам
            </button>
          </div>
        ) : null}

        {characters === null ? (
          <p className="muted">Загружаем персонажей…</p>
        ) : characters.length === 0 ? (
          <div className="empty empty--action">
            <p>
              {players.length === 0
                ? 'Как только появятся игроки, здесь можно будет создать их героев.'
                : 'Пока ни одного персонажа. Добавьте первого — с портретом, классом и статусами.'}
            </p>
            {players.length > 0 ? (
              <button className="button" onClick={() => setEditing('new')}>
                Добавить персонажа
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <p className="list-caption">
              {characters.length} {pluralize(characters.length, 'персонаж', 'персонажа', 'персонажей')}
            </p>

            <ul className="hero-grid">
              {characters.map((character) => (
                <CharacterCard
                  key={character.id}
                  profile={character}
                  player={character.playerId ? playerById.get(character.playerId) : undefined}
                  onEdit={() => setEditing(character)}
                  onDelete={() => setDeleting(character)}
                  onOpenPlayer={onOpenPlayer}
                />
              ))}
            </ul>
          </>
        )}
      </div>

      <CharacterFormModal
        open={editing !== null}
        profile={editing === 'new' ? null : editing}
        players={players}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          void refresh()
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Удалить персонажа?"
        description={
          deleting
            ? `«${deleting.name}» будет удалён вместе с портретом и статусами. Это действие нельзя отменить.`
            : undefined
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  )
}
