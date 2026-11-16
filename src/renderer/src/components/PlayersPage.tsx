import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, JSX } from 'react'
import type { Player } from '@shared/player'
import { playerFullName, playerInitials } from '@shared/domain'
import { api, errorMessage } from '@renderer/lib/api'
import { useI18n, useMessages } from '@renderer/i18n/LocaleProvider'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { Modal } from './ui/Modal'
import { IconPencil, IconPlus, IconTrash } from './ui/icons'

type EditingState = Player | 'new' | null

interface PlayersPageProps {
  onOpenPlayer: (playerId: string) => void
}

/** База игроков-людей: не персонажи, а люди, которых можно позвать за стол. */
export function PlayersPage({ onOpenPlayer }: PlayersPageProps): JSX.Element {
  const { messages: m, fill, plural, formatDate } = useI18n()
  const [players, setPlayers] = useState<Player[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditingState>(null)
  const [deleting, setDeleting] = useState<Player | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setPlayers(await api.players.list())
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
      await api.players.remove(deleting.id)
      setDeleting(null)
      setDeleteError(null)
      await refresh()
    } catch (caught) {
      setDeleteError(errorMessage(caught))
    }
  }

  return (
    <main className="page">
      <div className="page__inner">
        <header className="page-head">
          <div>
            <h1>{m.people.playersPage.title}</h1>
            <p className="muted">{m.people.playersPage.description}</p>
          </div>
          <button className="button button--primary" onClick={() => setEditing('new')}>
            <IconPlus width={16} height={16} />
            {m.people.playersPage.create}
          </button>
        </header>

        {error ? <p className="notice notice--error">{error}</p> : null}

        {players === null ? (
          <p className="muted">{m.people.playersPage.loading}</p>
        ) : players.length === 0 ? (
          <div className="empty empty--action">
            <p>{m.people.playersPage.empty}</p>
            <button className="button" onClick={() => setEditing('new')}>
              {m.people.playersPage.create}
            </button>
          </div>
        ) : (
          <>
            <p className="list-caption">{plural(players.length, m.people.playersCount)}</p>
            <ul className="player-list">
              {players.map((player) => {
                const fullName = playerFullName(player)

                return (
                  <li key={player.id} className="player-card">
                    <span className="player-card__avatar" aria-hidden="true">
                      {playerInitials(player)}
                    </span>

                    <div className="player-card__identity">
                      <button
                        type="button"
                        className="player-card__name-button"
                        title={fill(m.people.playersPage.charactersTitle, { name: fullName })}
                        onClick={() => onOpenPlayer(player.id)}
                      >
                        <span className="player-card__name">
                          {player.firstName}
                          {player.lastName ? (
                            <span className="player-card__surname"> {player.lastName}</span>
                          ) : null}
                        </span>
                      </button>
                      <span className="player-card__meta">
                        {fill(m.people.playersPage.since, { date: formatDate(player.createdAt) })}
                      </span>
                    </div>

                    <div className="player-card__actions">
                      <button
                        type="button"
                        className="icon-button"
                        title={m.people.playersPage.edit}
                        aria-label={fill(m.people.playersPage.editAria, { name: fullName })}
                        onClick={() => setEditing(player)}
                      >
                        <IconPencil />
                      </button>
                      <button
                        type="button"
                        className="icon-button icon-button--danger"
                        title={m.people.playersPage.delete}
                        aria-label={fill(m.people.playersPage.deleteAria, { name: fullName })}
                        onClick={() => {
                          setDeleteError(null)
                          setDeleting(player)
                        }}
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      <PlayerFormModal
        open={editing !== null}
        player={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          void refresh()
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={m.people.playersPage.deleteTitle}
        description={
          deleteError ??
          (deleting
            ? fill(m.people.playersPage.deleteDescription, {
                name: playerFullName(deleting)
              })
            : undefined)
        }
        confirmLabel={m.people.playersPage.deleteConfirm}
        onCancel={() => {
          setDeleting(null)
          setDeleteError(null)
        }}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  )
}

interface PlayerFormModalProps {
  open: boolean
  player: Player | null
  onClose: () => void
  onSaved: (player: Player) => void
}

function PlayerFormModal({ open, player, onClose, onSaved }: PlayerFormModalProps): JSX.Element {
  const m = useMessages()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const formId = useId()
  const firstFieldRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return

    setFirstName(player?.firstName ?? '')
    setLastName(player?.lastName ?? '')
    setError(null)
    setSaving(false)
  }, [open, player])

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (saving) return

    const trimmedFirstName = firstName.trim()
    const trimmedLastName = lastName.trim()

    if (!trimmedFirstName) {
      setError(m.people.playerForm.nameRequired)
      firstFieldRef.current?.focus()
      return
    }

    setSaving(true)
    setError(null)

    try {
      const saved = player
        ? await api.players.update({
            ...player,
            firstName: trimmedFirstName,
            lastName: trimmedLastName
          })
        : await api.players.create({ firstName: trimmedFirstName, lastName: trimmedLastName })

      onSaved(saved)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={player ? m.people.playerForm.editTitle : m.people.playerForm.createTitle}
      description={player ? undefined : m.people.playerForm.createDescription}
      onClose={onClose}
      initialFocusRef={firstFieldRef}
      footer={
        <>
          <button type="button" className="button" onClick={onClose} disabled={saving}>
            {m.people.playerForm.cancel}
          </button>
          <button
            type="submit"
            form={formId}
            className="button button--primary"
            disabled={saving || !firstName.trim()}
          >
            {saving ? m.people.playerForm.saving : m.people.playerForm.save}
          </button>
        </>
      }
    >
      <form id={formId} className="form-grid form-grid--two" onSubmit={(event) => void submit(event)}>
        <label className="field">
          <span className="field__label">{m.people.playerForm.firstNameLabel}</span>
          <input
            ref={firstFieldRef}
            className="input"
            value={firstName}
            maxLength={100}
            placeholder={m.people.playerForm.firstNamePlaceholder}
            autoComplete="off"
            onChange={(event) => setFirstName(event.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">{m.people.playerForm.lastNameLabel}</span>
          <input
            className="input"
            value={lastName}
            maxLength={100}
            placeholder={m.people.playerForm.lastNamePlaceholder}
            autoComplete="off"
            onChange={(event) => setLastName(event.target.value)}
          />
        </label>

        {error ? <p className="notice notice--error form-grid__full">{error}</p> : null}
      </form>
    </Modal>
  )
}
