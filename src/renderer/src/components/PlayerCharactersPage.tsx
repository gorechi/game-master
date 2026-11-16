import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { Player } from '@shared/player'
import type { CharacterProfile } from '@shared/characterProfile'
import type { Realm } from '@shared/realm'
import { playerFullName, playerInitials } from '@shared/domain'
import { api, errorMessage } from '@renderer/lib/api'
import { useI18n } from '@renderer/i18n/LocaleProvider'
import { CharacterCard } from './character/CharacterCard'
import { CharacterFormModal } from './character/CharacterFormModal'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { IconPlus } from './ui/icons'

interface PlayerCharactersPageProps {
  playerId: string
  realms: readonly Realm[]
  /** Откуда пришли — от этого зависит подпись кнопки «назад». */
  backLabel: string
  onBack: () => void
}

/** Все персонажи выбранного игрока. */
export function PlayerCharactersPage({
  playerId,
  realms,
  backLabel,
  onBack
}: PlayerCharactersPageProps): JSX.Element {
  const { messages: m, fill, plural, formatDate } = useI18n()
  const [player, setPlayer] = useState<Player | null | undefined>(undefined)
  const [characters, setCharacters] = useState<CharacterProfile[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<CharacterProfile | 'new' | null>(null)
  const [deleting, setDeleting] = useState<CharacterProfile | null>(null)

  const realmNames = new Map(realms.map((realm) => [realm.id, realm.name]))

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const [players, allCharacters] = await Promise.all([
        api.players.list(),
        api.characters.list()
      ])

      setPlayer(players.find((item) => item.id === playerId) ?? null)
      setCharacters(allCharacters.filter((character) => character.playerId === playerId))
      setError(null)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }, [playerId])

  useEffect(() => {
    setPlayer(undefined)
    setCharacters(null)
    void refresh()
  }, [refresh])

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

  return (
    <main className="page">
      <div className="page__inner">
        <div className="page-block">
          <button type="button" className="button button--ghost button--tiny page-back" onClick={onBack}>
            ← {backLabel}
          </button>

          <header className="page-head">
            <div className="player-page__identity">
              <span className="player-card__avatar player-page__avatar" aria-hidden="true">
                {player ? playerInitials(player) : '?'}
              </span>

              <div>
                <p className="page-kicker">{m.people.playerCharacters.kicker}</p>
                <h1>{player ? playerFullName(player) : m.people.playerCharacters.nameFallback}</h1>
                <p className="muted">
                  {characters === null || !player
                    ? m.people.playerCharacters.loadingSummary
                    : `${plural(
                        characters.length,
                        m.people.playerCharacters.characterCount
                      )} · ${fill(m.people.playerCharacters.since, {
                        date: formatDate(player.createdAt)
                      })}`}
                </p>
              </div>
            </div>

            <button
              className="button button--primary"
              onClick={() => setEditing('new')}
              disabled={!player}
            >
              <IconPlus width={16} height={16} />
              {m.people.playerCharacters.add}
            </button>
          </header>
        </div>

        {error ? <p className="notice notice--error">{error}</p> : null}

        {player === null ? (
          <div className="notice notice--action">
            <span>{m.people.playerCharacters.notFound}</span>
            <button className="button button--tiny" onClick={onBack}>
              {m.people.playerCharacters.back}
            </button>
          </div>
        ) : characters === null ? (
          <p className="muted">{m.people.playerCharacters.loading}</p>
        ) : characters.length === 0 ? (
          <div className="empty empty--action">
            <p>{m.people.playerCharacters.empty}</p>
            <button className="button" onClick={() => setEditing('new')}>
              {m.people.playerCharacters.add}
            </button>
          </div>
        ) : (
          <ul className="hero-grid">
            {characters.map((character) => (
              <CharacterCard
                key={character.id}
                profile={character}
                realmName={
                  realmNames.get(character.realmId) ?? m.people.playerCharacters.noRealm
                }
                player={player ?? undefined}
                onEdit={() => setEditing(character)}
                onDelete={() => setDeleting(character)}
              />
            ))}
          </ul>
        )}
      </div>

      <CharacterFormModal
        open={editing !== null}
        profile={editing === 'new' ? null : editing}
        players={player ? [player] : []}
        realms={realms}
        defaultPlayerId={player?.id}
        lockPlayer
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          void refresh()
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={m.people.playerCharacters.deleteTitle}
        description={
          deleting
            ? fill(m.people.playerCharacters.deleteDescription, { name: deleting.name })
            : undefined
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  )
}
