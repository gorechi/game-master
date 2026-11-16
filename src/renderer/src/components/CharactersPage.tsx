import { useCallback, useEffect, useMemo, useState } from 'react'
import type { JSX } from 'react'
import type { Player } from '@shared/player'
import type { CharacterProfile } from '@shared/characterProfile'
import type { Realm } from '@shared/realm'
import { api, errorMessage } from '@renderer/lib/api'
import { useI18n } from '@renderer/i18n/LocaleProvider'
import { CharacterCard } from './character/CharacterCard'
import { CharacterFormModal } from './character/CharacterFormModal'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { IconPlus } from './ui/icons'

interface CharactersPageProps {
  realms: readonly Realm[]
  onOpenPlayers: () => void
  onOpenPlayer: (playerId: string) => void
}

/** Все персонажи приложения: у каждого игрока их может быть несколько. */
export function CharactersPage({
  realms,
  onOpenPlayers,
  onOpenPlayer
}: CharactersPageProps): JSX.Element {
  const { messages: m, fill, plural } = useI18n()
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
  const realmNames = useMemo(
    () => new Map(realms.map((realm) => [realm.id, realm.name])),
    [realms]
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
            <h1>{m.people.charactersPage.title}</h1>
            <p className="muted">{m.people.charactersPage.description}</p>
          </div>
          <button
            className="button button--primary"
            onClick={() => setEditing('new')}
            disabled={players.length === 0}
          >
            <IconPlus width={16} height={16} />
            {m.people.charactersPage.add}
          </button>
        </header>

        {error ? <p className="notice notice--error">{error}</p> : null}

        {noPlayers ? (
          <div className="notice notice--action">
            <span>{m.people.charactersPage.noPlayers}</span>
            <button className="button button--tiny" onClick={onOpenPlayers}>
              {m.people.charactersPage.goToPlayers}
            </button>
          </div>
        ) : null}

        {characters === null ? (
          <p className="muted">{m.people.charactersPage.loading}</p>
        ) : characters.length === 0 ? (
          <div className="empty empty--action">
            <p>
              {players.length === 0
                ? m.people.charactersPage.emptyNoPlayers
                : m.people.charactersPage.empty}
            </p>
            {players.length > 0 ? (
              <button className="button" onClick={() => setEditing('new')}>
                {m.people.charactersPage.add}
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <p className="list-caption">
              {plural(characters.length, m.people.charactersPage.characterCount)}
            </p>

            <ul className="hero-grid">
              {characters.map((character) => (
                <CharacterCard
                  key={character.id}
                  profile={character}
                  realmName={
                    realmNames.get(character.realmId) ?? m.people.charactersPage.noRealm
                  }
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
        realms={realms}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          void refresh()
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={m.people.charactersPage.deleteTitle}
        description={
          deleting
            ? fill(m.people.charactersPage.deleteDescription, { name: deleting.name })
            : undefined
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  )
}
