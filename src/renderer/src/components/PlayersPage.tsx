import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, JSX } from 'react'
import type { Player } from '@shared/player'
import { playerFullName, playerInitials } from '@shared/domain'
import { api, errorMessage } from '@renderer/lib/api'
import { formatDate, pluralize } from '@renderer/lib/format'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { Modal } from './ui/Modal'
import { IconPencil, IconPlus, IconTrash } from './ui/icons'

type EditingState = Player | 'new' | null

interface PlayersPageProps {
  onOpenPlayer: (playerId: string) => void
}

/** База игроков-людей: не персонажи, а люди, которых можно позвать за стол. */
export function PlayersPage({ onOpenPlayer }: PlayersPageProps): JSX.Element {
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
            <h1>Игроки</h1>
            <p className="muted">
              Люди, которые садятся за стол. Их герои — в разделе «Персонажи».
            </p>
          </div>
          <button className="button button--primary" onClick={() => setEditing('new')}>
            <IconPlus width={16} height={16} />
            Добавить игрока
          </button>
        </header>

        {error ? <p className="notice notice--error">{error}</p> : null}

        {players === null ? (
          <p className="muted">Загружаем базу игроков…</p>
        ) : players.length === 0 ? (
          <div className="empty empty--action">
            <p>Пока ни одного игрока. Добавьте первого — это база людей, которых можно позвать за стол.</p>
            <button className="button" onClick={() => setEditing('new')}>
              Добавить игрока
            </button>
          </div>
        ) : (
          <>
            <p className="list-caption">
              {players.length} {pluralize(players.length, 'игрок', 'игрока', 'игроков')}
            </p>
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
                        title={`Персонажи игрока ${fullName}`}
                        onClick={() => onOpenPlayer(player.id)}
                      >
                        <span className="player-card__name">
                          {player.firstName}
                          {player.lastName ? (
                            <span className="player-card__surname"> {player.lastName}</span>
                          ) : null}
                        </span>
                      </button>
                      <span className="player-card__meta">В базе с {formatDate(player.createdAt)}</span>
                    </div>

                    <div className="player-card__actions">
                      <button
                        type="button"
                        className="icon-button"
                        title="Редактировать"
                        aria-label={`Редактировать игрока ${fullName}`}
                        onClick={() => setEditing(player)}
                      >
                        <IconPencil />
                      </button>
                      <button
                        type="button"
                        className="icon-button icon-button--danger"
                        title="Удалить"
                        aria-label={`Удалить игрока ${fullName}`}
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
        title="Удалить игрока?"
        description={
          deleteError ??
          (deleting
            ? `Игрок «${playerFullName(deleting)}» будет удалён из базы. Персонажи останутся, но потеряют привязку к игроку.`
            : undefined)
        }
        confirmLabel="Удалить"
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
      setError('Укажите имя игрока')
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
      title={player ? 'Редактировать игрока' : 'Новый игрок'}
      description={player ? undefined : 'Игрок — это человек, который садится за стол.'}
      onClose={onClose}
      initialFocusRef={firstFieldRef}
      footer={
        <>
          <button type="button" className="button" onClick={onClose} disabled={saving}>
            Отмена
          </button>
          <button
            type="submit"
            form={formId}
            className="button button--primary"
            disabled={saving || !firstName.trim()}
          >
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </>
      }
    >
      <form id={formId} className="form-grid form-grid--two" onSubmit={(event) => void submit(event)}>
        <label className="field">
          <span className="field__label">Имя</span>
          <input
            ref={firstFieldRef}
            className="input"
            value={firstName}
            maxLength={100}
            placeholder="Анна"
            autoComplete="off"
            onChange={(event) => setFirstName(event.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Фамилия</span>
          <input
            className="input"
            value={lastName}
            maxLength={100}
            placeholder="Смирнова"
            autoComplete="off"
            onChange={(event) => setLastName(event.target.value)}
          />
        </label>

        {error ? <p className="notice notice--error form-grid__full">{error}</p> : null}
      </form>
    </Modal>
  )
}
