import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, JSX } from 'react'
import type { GameMap, MapPlace } from '@shared/map'
import type { PlaceType } from '@shared/placeType'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { IconPencil } from '../ui/icons'
import { PlaceTypeIcon } from '../placeTypes/PlaceTypeIcon'
import { PlaceDescriptionModal } from './PlaceDescriptionModal'
import { PlaceIconPickerModal } from './PlaceIconPickerModal'

interface PlaceFormModalProps {
  open: boolean
  place: MapPlace | null
  /** Все остальные места карты — с ними можно соединить путь. */
  otherPlaces: readonly MapPlace[]
  /** Места, уже связанные с этим (пути симметричны). */
  connectedIds: readonly string[]
  /** Другие карты, на которые может вести выход. */
  otherMaps: readonly GameMap[]
  /** Иконки сеттинга, к которому относится карта. */
  placeTypes: readonly PlaceType[]
  onClose: () => void
  onSave: (input: {
    name: string
    description: string
    isExit: boolean
    linkedMapId: string | null
    placeTypeId: string | null
    connectedIds: string[]
  }) => void
}

/** Редактирование места: имя, иконка, выход на другую карту и пути к другим местам. */
export function PlaceFormModal({
  open,
  place,
  otherPlaces,
  connectedIds,
  otherMaps,
  placeTypes,
  onClose,
  onSave
}: PlaceFormModalProps): JSX.Element {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionOpen, setDescriptionOpen] = useState(false)
  const [placeTypeId, setPlaceTypeId] = useState<string | null>(null)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [isExit, setIsExit] = useState(false)
  const [linkedMapId, setLinkedMapId] = useState<string | null>(null)
  const [connections, setConnections] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const formId = useId()

  useEffect(() => {
    if (!open || !place) return

    setName(place.name)
    setDescription(place.description ?? '')
    setDescriptionOpen(false)
    setPlaceTypeId(place.placeTypeId ?? null)
    setIconPickerOpen(false)
    setIsExit(place.isExit)
    setLinkedMapId(place.linkedMapId)
    setConnections([...connectedIds])
    setError(null)
    window.setTimeout(() => nameRef.current?.focus(), 0)
  }, [open, place])

  function toggleConnection(id: string): void {
    setConnections((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  function submit(event: FormEvent): void {
    event.preventDefault()
    const trimmed = name.trim()

    if (!trimmed) {
      setError('Укажите название места')
      nameRef.current?.focus()
      return
    }

    onSave({
      name: trimmed,
      description,
      isExit,
      linkedMapId: isExit ? linkedMapId : null,
      placeTypeId,
      connectedIds: connections
    })
  }

  const descriptionPreview = description.trim()
    ? description.trim().replace(/\s+/g, ' ').slice(0, 180)
    : 'Добавьте описание, заметки и важные детали этого места.'

  const selectedIcon = placeTypes.find((icon) => icon.id === placeTypeId) ?? null

  return (
    <>
      <Modal
        open={open}
        title={place ? 'Место' : 'Новое место'}
      description="Название, иконка, выход на другую карту и пути к другим местам. Путь всегда двусторонний."
      size="md"
      onClose={onClose}
      initialFocusRef={nameRef}
      footer={
        <>
          <button type="button" className="button" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" form={formId} className="button button--primary">
            Сохранить место
          </button>
        </>
      }
    >
      <form id={formId} className="map-place-editor" onSubmit={submit} noValidate>
        <div className="place-description-bar">
          <div className="place-description-bar__text">
            <span className="field__label">Описание места</span>
            <p className={`place-description-bar__preview${description.trim() ? '' : ' muted'}`}>
              {descriptionPreview}
            </p>
          </div>
          <button
            type="button"
            className="place-description-bar__edit"
            title="Редактировать описание"
            aria-label="Редактировать описание места"
            onClick={() => setDescriptionOpen(true)}
          >
            <IconPencil width={22} height={22} />
          </button>
        </div>

        <label className="field">
          <span className="field__label">Название места</span>
          <input
            ref={nameRef}
            className="input"
            value={name}
            maxLength={100}
            placeholder="Таверна «Пьяный гоблин»"
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <div className="field">
          <span className="field__label">Иконка</span>
          {placeTypes.length > 0 ? (
            <button
              type="button"
              className={`place-icon-select${selectedIcon ? '' : ' place-icon-select--empty'}`}
              title={selectedIcon ? 'Изменить иконку' : 'Выбрать иконку'}
              aria-label={selectedIcon ? 'Изменить иконку' : 'Выбрать иконку'}
              aria-haspopup="dialog"
              onClick={() => setIconPickerOpen(true)}
            >
              <span className="place-icon-select__circle">
                {selectedIcon ? <PlaceTypeIcon svg={selectedIcon.iconSvg} size={29} /> : '—'}
              </span>
            </button>
          ) : (
            <span className="game-editor__hint">
              В сеттинге пока нет иконок. Добавьте их на экране сеттинга.
            </span>
          )}
        </div>

        <label className="map-exit-toggle">
          <input
            type="checkbox"
            className="checkbox"
            checked={isExit}
            onChange={(event) => setIsExit(event.target.checked)}
          />
          <span>
            <strong>Выход из карты</strong>
            <small>Место, через которое можно перейти на другую карту.</small>
          </span>
        </label>

        {isExit ? (
          <div className="field">
            <span className="field__label">Выход ведёт на карту</span>
            {otherMaps.length === 0 ? (
              <p className="abilities-editor__empty">
                Других карт пока нет. Создайте их в разделе «Карты», чтобы связать выход.
              </p>
            ) : (
              <Select
                ariaLabel="Карта, на которую ведёт выход"
                value={linkedMapId ?? ''}
                placeholder="Не выбрано"
                options={[
                  { value: '', label: 'Не выбрано' },
                  ...otherMaps.map((map) => ({ value: map.id, label: map.name }))
                ]}
                onChange={(value) => setLinkedMapId(value || null)}
              />
            )}
          </div>
        ) : null}

        <section className="map-connection-section">
          <header className="editor-section__head">
            <h3>Пути</h3>
            <span className="editor-section__count">выбрано {connections.length}</span>
          </header>

          {otherPlaces.length === 0 ? (
            <p className="notice">
              На карте пока нет других мест. Добавьте их, чтобы проложить пути.
            </p>
          ) : (
            <div className="map-connection-list">
              {otherPlaces.map((other) => {
                const checked = connections.includes(other.id)

                return (
                  <label
                    key={other.id}
                    className={`map-connection-row${checked ? ' map-connection-row--on' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={checked}
                      onChange={() => toggleConnection(other.id)}
                    />
                    <span className="map-connection-row__name">{other.name}</span>
                    {other.isExit ? <span className="map-badge">Выход</span> : null}
                  </label>
                )
              })}
            </div>
          )}
        </section>

        {error ? <p className="notice notice--error">{error}</p> : null}
      </form>
      </Modal>

      <PlaceDescriptionModal
        open={descriptionOpen}
        placeName={name.trim() || 'Место'}
        value={description}
        onClose={() => setDescriptionOpen(false)}
        onSave={(value) => {
          setDescription(value)
          setDescriptionOpen(false)
        }}
      />

      <PlaceIconPickerModal
        open={iconPickerOpen}
        placeName={name.trim() || 'Место'}
        value={placeTypeId}
        placeTypes={placeTypes}
        onClose={() => setIconPickerOpen(false)}
        onSelect={(value) => {
          setPlaceTypeId(value)
          setIconPickerOpen(false)
        }}
      />
    </>
  )
}
