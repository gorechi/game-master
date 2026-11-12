import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { DragEvent, FormEvent, JSX, KeyboardEvent } from 'react'
import type { Player } from '@shared/player'
import type { CharacterProfile, CharacterProfileInput } from '@shared/characterProfile'
import { playerFullName } from '@shared/domain'
import { api, errorMessage } from '@renderer/lib/api'
import { prepareCharacterImage } from '@renderer/lib/image'
import { pluralize } from '@renderer/lib/format'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { Modal } from './ui/Modal'
import { Select } from './ui/Select'
import { IconPencil, IconPlus, IconTrash } from './ui/icons'

const STATUS_SUGGESTIONS = [
  'Ранен',
  'Отравлен',
  'Проклят',
  'В розыске',
  'Скрывается',
  'Благословлён',
  'Истощён',
  'Мёртв'
]

const MAX_STATUSES = 12

interface CharactersPageProps {
  onOpenPlayers: () => void
}

/** Карточки персонажей: у каждого игрока их может быть несколько. */
export function CharactersPage({ onOpenPlayers }: CharactersPageProps): JSX.Element {
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

/* ------------------------------------------------------------------ */
/* Карточка                                                           */
/* ------------------------------------------------------------------ */

interface CharacterCardProps {
  profile: CharacterProfile
  player: Player | undefined
  onEdit: () => void
  onDelete: () => void
}

function CharacterCard({ profile, player, onEdit, onDelete }: CharacterCardProps): JSX.Element {
  return (
    <li className="hero-card">
      <div className="hero-card__inner">
        <header className="hero-card__head">
          <h3 className="hero-card__name">{profile.name}</h3>
          <span className="hero-card__class" title={profile.className || 'Класс не указан'}>
            {profile.className || 'Без класса'}
          </span>
        </header>

        <div className="hero-card__art">
          {profile.image ? (
            <img src={profile.image} alt={`Портрет: ${profile.name}`} loading="lazy" />
          ) : (
            <HeroPlaceholder />
          )}
        </div>

        <dl className="hero-card__facts">
          <div>
            <dt>Раса</dt>
            <dd>{profile.race || '—'}</dd>
          </div>
          <div>
            <dt>Игрок</dt>
            <dd>{player ? playerFullName(player) : 'Без игрока'}</dd>
          </div>
        </dl>

        <div className="hero-card__statuses">
          {profile.statuses.length > 0 ? (
            profile.statuses.map((status) => (
              <span key={status} className="status-tag">
                {status}
              </span>
            ))
          ) : (
            <span className="hero-card__no-status">Без статусов</span>
          )}
        </div>

        <footer className="hero-card__tools">
          <button
            type="button"
            className="icon-button"
            title="Редактировать"
            aria-label={`Редактировать персонажа ${profile.name}`}
            onClick={onEdit}
          >
            <IconPencil />
          </button>
          <button
            type="button"
            className="icon-button icon-button--danger"
            title="Удалить"
            aria-label={`Удалить персонажа ${profile.name}`}
            onClick={onDelete}
          >
            <IconTrash />
          </button>
        </footer>
      </div>
    </li>
  )
}

function HeroPlaceholder(): JSX.Element {
  return (
    <span className="portrait-placeholder" aria-hidden="true">
      <svg
        viewBox="0 0 120 120"
        width="64"
        height="64"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      >
        <path d="M60 12l36 15v32c0 26-18 44-36 51-18-7-36-25-36-51V27l36-15Z" opacity="0.9" />
        <path d="M60 42l19 32H41l19-32Z" opacity="0.7" />
      </svg>
      <span className="portrait-placeholder__label">Нет портрета</span>
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Форма создания и редактирования                                    */
/* ------------------------------------------------------------------ */

interface CharacterFormModalProps {
  open: boolean
  profile: CharacterProfile | null
  players: Player[]
  onClose: () => void
  onSaved: (profile: CharacterProfile) => void
}

function CharacterFormModal({
  open,
  profile,
  players,
  onClose,
  onSaved
}: CharacterFormModalProps): JSX.Element {
  const [name, setName] = useState('')
  const [className, setClassName] = useState('')
  const [race, setRace] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [statuses, setStatuses] = useState<string[]>([])
  const [statusDraft, setStatusDraft] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [processingImage, setProcessingImage] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const formId = useId()
  const nameRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return

    setName(profile?.name ?? '')
    setClassName(profile?.className ?? '')
    setRace(profile?.race ?? '')
    setPlayerId(profile?.playerId ?? '')
    setStatuses(profile?.statuses ?? [])
    setStatusDraft('')
    setImage(profile?.image ?? null)
    setImageError(null)
    setError(null)
    setSaving(false)
    setProcessingImage(false)
    setDragging(false)
  }, [open, profile])

  async function applyFile(file: File): Promise<void> {
    setImageError(null)
    setProcessingImage(true)
    try {
      setImage(await prepareCharacterImage(file))
    } catch (caught) {
      setImageError(errorMessage(caught))
    } finally {
      setProcessingImage(false)
    }
  }

  function addStatus(raw: string): void {
    const value = raw.trim().replace(/,$/, '')
    if (!value) return
    if (statuses.includes(value)) {
      setStatusDraft('')
      return
    }
    setStatuses((current) =>
      current.length >= MAX_STATUSES ? current : [...current, value.slice(0, 40)]
    )
    setStatusDraft('')
  }

  function removeStatus(value: string): void {
    setStatuses((current) => current.filter((status) => status !== value))
  }

  function onStatusKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addStatus(statusDraft)
      return
    }
    if (event.key === 'Backspace' && statusDraft === '' && statuses.length > 0) {
      setStatuses((current) => current.slice(0, -1))
    }
  }

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (saving || processingImage) return

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Укажите имя персонажа')
      nameRef.current?.focus()
      return
    }
    if (!playerId || !players.some((player) => player.id === playerId)) {
      setError('Выберите игрока — персонаж должен за кем-то числиться')
      return
    }

    const input: CharacterProfileInput = {
      playerId,
      name: trimmedName,
      className: className.trim(),
      race: race.trim(),
      statuses,
      image
    }

    setSaving(true)
    setError(null)

    try {
      const saved = profile
        ? await api.characters.update({ ...profile, ...input })
        : await api.characters.create(input)
      onSaved(saved)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void applyFile(file)
  }

  const playerIsKnown = players.some((player) => player.id === playerId)
  const canSave = Boolean(name.trim()) && playerIsKnown && !saving && !processingImage
  const orphanPlayer = Boolean(playerId) && !playerIsKnown

  return (
    <Modal
      open={open}
      title={profile ? 'Редактировать персонажа' : 'Новый персонаж'}
      description={
        profile
          ? undefined
          : 'Портрет, класс, раса и статусы. Игрок уже должен быть в базе.'
      }
      size="lg"
      onClose={onClose}
      initialFocusRef={nameRef}
      footer={
        <>
          <button type="button" className="button" onClick={onClose} disabled={saving}>
            Отмена
          </button>
          <button type="submit" form={formId} className="button button--primary" disabled={!canSave}>
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </>
      }
    >
      <form
        id={formId}
        className="character-form"
        onSubmit={(event) => void submit(event)}
      >
        <div className="character-form__portrait">
          <div
            className={`portrait-field${dragging ? ' portrait-field--drag' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="Загрузить портрет персонажа"
            onClick={() => fileRef.current?.click()}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                fileRef.current?.click()
              }
            }}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            {image ? (
              <img src={image} alt="Портрет персонажа" />
            ) : (
              <HeroPlaceholder />
            )}

            {image ? null : (
              <span className="portrait-field__hint">Перетащите файл или нажмите</span>
            )}

            {processingImage ? (
              <span className="portrait-field__processing">Обрабатываем…</span>
            ) : null}

            {image ? (
              <button
                type="button"
                className="portrait-field__remove"
                onClick={(event) => {
                  event.stopPropagation()
                  setImage(null)
                }}
              >
                Убрать фото
              </button>
            ) : null}

            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void applyFile(file)
                event.target.value = ''
              }}
            />
          </div>

          {imageError ? <p className="notice notice--error">{imageError}</p> : null}
        </div>

        <div className="character-form__fields">
          <label className="field">
            <span className="field__label">Имя</span>
            <input
              ref={nameRef}
              className="input"
              value={name}
              maxLength={80}
              placeholder="Ария Среброкрылая"
              autoComplete="off"
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <div className="form-grid form-grid--two">
            <label className="field">
              <span className="field__label">Класс</span>
              <input
                className="input"
                value={className}
                maxLength={60}
                placeholder="Плут 5"
                autoComplete="off"
                onChange={(event) => setClassName(event.target.value)}
              />
            </label>

            <label className="field">
              <span className="field__label">Раса</span>
              <input
                className="input"
                value={race}
                maxLength={60}
                placeholder="Полуэльф"
                autoComplete="off"
                onChange={(event) => setRace(event.target.value)}
              />
            </label>
          </div>

          <div className="field">
            <span className="field__label">Игрок</span>
            <Select
              ariaLabel="Игрок"
              value={playerId}
              placeholder={players.length === 0 ? 'Сначала добавьте игрока' : 'Выберите игрока'}
              options={players.map((player) => ({
                value: player.id,
                label: playerFullName(player)
              }))}
              onChange={setPlayerId}
            />
            {orphanPlayer ? (
              <p className="notice notice--error">
                Игрок этого персонажа удалён из базы — выберите нового.
              </p>
            ) : null}
          </div>

          <div className="field">
            <span className="field__label">Статусы</span>

            <div className="tags-field">
              {statuses.length > 0 ? (
                <div className="tags-field__chips">
                  {statuses.map((status) => (
                    <span key={status} className="tags-field__chip">
                      {status}
                      <button
                        type="button"
                        onClick={() => removeStatus(status)}
                        aria-label={`Убрать статус ${status}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}

              <input
                className="input"
                value={statusDraft}
                maxLength={40}
                placeholder={
                  statuses.length >= MAX_STATUSES
                    ? `Достигнут лимит: ${MAX_STATUSES}`
                    : 'Введите статус и нажмите Enter'
                }
                disabled={statuses.length >= MAX_STATUSES}
                onChange={(event) => setStatusDraft(event.target.value)}
                onKeyDown={onStatusKeyDown}
                onBlur={() => {
                  if (statusDraft.trim()) addStatus(statusDraft)
                }}
              />

              <div className="tags-field__suggestions">
                {STATUS_SUGGESTIONS.filter((status) => !statuses.includes(status)).map(
                  (status) => (
                    <button
                      key={status}
                      type="button"
                      className="tags-field__suggestion"
                      onClick={() => addStatus(status)}
                    >
                      + {status}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {error ? <p className="notice notice--error form-grid__full">{error}</p> : null}
        </div>
      </form>
    </Modal>
  )
}
