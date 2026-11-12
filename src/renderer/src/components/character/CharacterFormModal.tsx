import { useEffect, useId, useRef, useState } from 'react'
import type { DragEvent, FormEvent, JSX, KeyboardEvent } from 'react'
import type { Player } from '@shared/player'
import type { CharacterProfile, CharacterProfileInput } from '@shared/characterProfile'
import { clampCharacterLevel, playerFullName } from '@shared/domain'
import { api, errorMessage } from '@renderer/lib/api'
import { prepareCharacterImage } from '@renderer/lib/image'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { HeroPlaceholder } from './CharacterCard'

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

interface CharacterFormModalProps {
  open: boolean
  profile: CharacterProfile | null
  players: Player[]
  /** Игрок, за которым закрепляем нового персонажа (например, на экране игрока). */
  defaultPlayerId?: string
  /** Если задано, поле игрока показывается только для чтения. */
  lockPlayer?: boolean
  onClose: () => void
  onSaved: (profile: CharacterProfile) => void
}

export function CharacterFormModal({
  open,
  profile,
  players,
  defaultPlayerId,
  lockPlayer = false,
  onClose,
  onSaved
}: CharacterFormModalProps): JSX.Element {
  const [name, setName] = useState('')
  const [className, setClassName] = useState('')
  const [level, setLevel] = useState('1')
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
    setLevel(String(profile?.level ?? 1))
    setRace(profile?.race ?? '')
    setPlayerId(profile?.playerId ?? defaultPlayerId ?? '')
    setStatuses(profile?.statuses ?? [])
    setStatusDraft('')
    setImage(profile?.image ?? null)
    setImageError(null)
    setError(null)
    setSaving(false)
    setProcessingImage(false)
    setDragging(false)
  }, [open, profile, defaultPlayerId])

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
      level: clampCharacterLevel(Number.parseInt(level, 10)),
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
  const lockedPlayer = players.find((player) => player.id === playerId)

  return (
    <Modal
      open={open}
      title={profile ? 'Редактировать персонажа' : 'Новый персонаж'}
      description={
        profile
          ? undefined
          : 'Портрет, класс, уровень, раса и статусы. Игрок уже должен быть в базе.'
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

          <div className="character-form__row">
            <label className="field">
              <span className="field__label">Класс</span>
              <input
                className="input"
                value={className}
                maxLength={60}
                placeholder="Плут"
                autoComplete="off"
                onChange={(event) => setClassName(event.target.value)}
              />
            </label>

            <label className="field character-form__level">
              <span className="field__label">Уровень</span>
              <input
                className="input"
                type="number"
                min={1}
                max={20}
                inputMode="numeric"
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                onBlur={() => setLevel(String(clampCharacterLevel(Number.parseInt(level, 10))))}
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
            {lockPlayer && lockedPlayer ? (
              <div className="locked-value">{playerFullName(lockedPlayer)}</div>
            ) : (
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
            )}
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
            </div>

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

          {error ? <p className="notice notice--error form-grid__full">{error}</p> : null}
        </div>
      </form>
    </Modal>
  )
}
