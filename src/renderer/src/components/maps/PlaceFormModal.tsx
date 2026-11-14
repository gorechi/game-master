import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, JSX } from 'react'
import type { GameMap, MapPlace } from '@shared/map'
import type { PlaceType } from '@shared/placeType'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { PlaceTypeIcon } from '../placeTypes/PlaceTypeIcon'

interface PlaceFormModalProps {
  open: boolean
  place: MapPlace | null
  /** Все остальные места карты — с ними можно соединить путь. */
  otherPlaces: readonly MapPlace[]
  /** Места, уже связанные с этим (пути симметричны). */
  connectedIds: readonly string[]
  /** Другие карты, на которые может вести выход. */
  otherMaps: readonly GameMap[]
  /** Типы мест сеттинга, к которому относится карта. */
  placeTypes: readonly PlaceType[]
  onClose: () => void
  onSave: (input: {
    name: string
    isExit: boolean
    linkedMapId: string | null
    placeTypeId: string | null
    connectedIds: string[]
  }) => void
}

/** Редактирование места: имя, тип, выход на другую карту и пути к другим местам. */
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
  const [placeTypeId, setPlaceTypeId] = useState<string | null>(null)
  const [isExit, setIsExit] = useState(false)
  const [linkedMapId, setLinkedMapId] = useState<string | null>(null)
  const [connections, setConnections] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const formId = useId()

  useEffect(() => {
    if (!open || !place) return

    setName(place.name)
    setPlaceTypeId(place.placeTypeId ?? null)
    setIsExit(place.isExit)
    setLinkedMapId(place.linkedMapId)
    setConnections([...connectedIds])
    setError(null)
    window.setTimeout(() => nameRef.current?.focus(), 0)
  }, [open, place])

  const selectedType = placeTypeId
    ? (placeTypes.find((placeType) => placeType.id === placeTypeId) ?? null)
    : null

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
      isExit,
      linkedMapId: isExit ? linkedMapId : null,
      placeTypeId,
      connectedIds: connections
    })
  }

  return (
    <Modal
      open={open}
      title={place ? 'Место' : 'Новое место'}
      description="Название, выход на другую карту и пути к другим местам. Путь всегда двусторонний."
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
          <span className="field__label">Тип места</span>
          <Select
            ariaLabel="Тип места"
            value={placeTypeId ?? ''}
            placeholder="Без типа"
            options={[
              { value: '', label: 'Без типа' },
              ...placeTypes.map((placeType) => ({
                value: placeType.id,
                label: placeType.name
              }))
            ]}
            onChange={(value) => setPlaceTypeId(value || null)}
          />

          {selectedType ? (
            <span className="place-type-choice">
              <span className="place-type-choice__icon">
                <PlaceTypeIcon svg={selectedType.iconSvg} size={18} />
              </span>
              {selectedType.name}
            </span>
          ) : (
            <span className="game-editor__hint">Можно оставить место без типа.</span>
          )}

          {placeTypes.length === 0 ? (
            <span className="game-editor__hint">
              В этом сеттинге пока нет типов мест — создайте их на экране сеттинга.
            </span>
          ) : null}
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
  )
}
