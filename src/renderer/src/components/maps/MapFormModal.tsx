import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, JSX } from 'react'
import type { GameMap, MapPath, MapPlace } from '@shared/map'
import {
  connectedPlaceIds,
  createMapPlace,
  placePaths,
  setPlaceConnections
} from '@shared/domain'
import { api, errorMessage } from '@renderer/lib/api'
import { pluralize } from '@renderer/lib/format'
import { Modal } from '../ui/Modal'
import { IconPencil, IconPlus, IconTrash } from '../ui/icons'
import { PlaceFormModal } from './PlaceFormModal'

interface MapFormModalProps {
  open: boolean
  map: GameMap | null
  onClose: () => void
  onSaved: (map: GameMap) => void
}

/** Создание и редактирование карты: название, места и пути между ними. */
export function MapFormModal({ open, map, onClose, onSaved }: MapFormModalProps): JSX.Element {
  const [name, setName] = useState('')
  const [places, setPlaces] = useState<MapPlace[]>([])
  const [paths, setPaths] = useState<MapPath[]>([])
  const [otherMaps, setOtherMaps] = useState<GameMap[]>([])
  const [placeName, setPlaceName] = useState('')
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const formId = useId()

  useEffect(() => {
    if (!open) return

    setName(map?.name ?? '')
    setPlaces(map?.places ?? [])
    setPaths(map?.paths ?? [])
    setOtherMaps([])
    setPlaceName('')
    setEditingPlaceId(null)
    setError(null)
    setSaving(false)
    window.setTimeout(() => nameRef.current?.focus(), 0)

    let cancelled = false

    void api.maps
      .list()
      .then((maps) => {
        if (!cancelled) setOtherMaps(maps.filter((item) => item.id !== map?.id))
      })
      .catch(() => {
        if (!cancelled) setOtherMaps([])
      })

    return () => {
      cancelled = true
    }
  }, [open, map])

  const editingPlace = editingPlaceId
    ? (places.find((place) => place.id === editingPlaceId) ?? null)
    : null
  const otherPlaces = editingPlace
    ? places.filter((place) => place.id !== editingPlace.id)
    : []
  const editingConnections = editingPlace ? connectedPlaceIds(paths, editingPlace.id) : []

  function addPlace(): void {
    const trimmed = placeName.trim()
    if (!trimmed) return

    setPlaces((current) => [...current, createMapPlace(trimmed)])
    setPlaceName('')
  }

  function removePlace(placeId: string): void {
    setPlaces((current) => current.filter((place) => place.id !== placeId))
    setPaths((current) => current.filter((path) => path.a !== placeId && path.b !== placeId))
    setEditingPlaceId((current) => (current === placeId ? null : current))
  }

  function savePlace(input: {
    name: string
    isExit: boolean
    linkedMapId: string | null
    connectedIds: string[]
  }): void {
    if (!editingPlace) return

    setPlaces((current) =>
      current.map((place) =>
        place.id === editingPlace.id
          ? {
              ...place,
              name: input.name,
              isExit: input.isExit,
              linkedMapId: input.linkedMapId
            }
          : place
      )
    )
    setPaths((current) => setPlaceConnections(current, editingPlace.id, input.connectedIds))
    setEditingPlaceId(null)
  }

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (saving) return

    const trimmed = name.trim()
    if (!trimmed) {
      setError('Укажите название карты')
      nameRef.current?.focus()
      return
    }

    setSaving(true)
    setError(null)

    try {
      const input = { name: trimmed, places, paths }
      const saved = map
        ? await api.maps.update({ ...map, ...input })
        : await api.maps.create(input)

      onSaved(saved)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  const linkedMapName = (mapId: string | null): string | null =>
    mapId ? (otherMaps.find((item) => item.id === mapId)?.name ?? null) : null

  return (
    <>
      <Modal
        open={open}
        title={map ? 'Редактировать карту' : 'Новая карта'}
        description="Пространство, в котором проходит игра. Добавьте места и соедините их путями."
        size="lg"
        onClose={onClose}
        initialFocusRef={nameRef}
        footer={
          <>
            <button type="button" className="button" onClick={onClose} disabled={saving}>
              Отмена
            </button>
            <button
              type="submit"
              form={formId}
              className="button button--primary"
              disabled={saving}
            >
              {saving ? 'Сохраняем…' : 'Сохранить карту'}
            </button>
          </>
        }
      >
        <form id={formId} className="map-editor" onSubmit={(event) => void submit(event)}>
          <label className="field">
            <span className="field__label">Название карты</span>
            <input
              ref={nameRef}
              className="input"
              value={name}
              maxLength={120}
              placeholder="Королевство пепельных дорог"
              autoComplete="off"
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <section className="editor-section">
            <header className="editor-section__head">
              <h3>Места</h3>
              <span className="editor-section__count">
                {places.length} {pluralize(places.length, 'место', 'места', 'мест')}
              </span>
            </header>

            <div className="map-add-place">
              <input
                className="input"
                value={placeName}
                maxLength={100}
                placeholder="Название нового места"
                autoComplete="off"
                onChange={(event) => setPlaceName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  addPlace()
                }}
              />
              <button
                type="button"
                className="button"
                onClick={addPlace}
                disabled={!placeName.trim()}
              >
                <IconPlus width={15} height={15} />
                Добавить место
              </button>
            </div>

            {places.length === 0 ? (
              <div className="map-place-list map-place-list--empty">
                <p>Пока ни одного места. Добавьте первое — с него начнётся карта.</p>
              </div>
            ) : (
              <ul className="map-place-list">
                {places.map((place) => {
                  const links = placePaths(paths, place.id).length
                  const linkedName = linkedMapName(place.linkedMapId)

                  return (
                    <li key={place.id} className="map-place-row">
                      <span className="map-place-row__name">{place.name}</span>
                      {place.isExit ? <span className="map-badge">Выход</span> : null}
                      {linkedName ? (
                        <span className="map-place-row__link">→ {linkedName}</span>
                      ) : null}
                      <span className="map-place-row__meta">
                        {links} {pluralize(links, 'путь', 'пути', 'путей')}
                      </span>

                      <div className="map-place-row__actions">
                        <button
                          type="button"
                          className="icon-button"
                          title="Редактировать место и пути"
                          aria-label={`Редактировать место ${place.name}`}
                          onClick={() => setEditingPlaceId(place.id)}
                        >
                          <IconPencil />
                        </button>
                        <button
                          type="button"
                          className="icon-button icon-button--danger"
                          title="Удалить место"
                          aria-label={`Удалить место ${place.name}`}
                          onClick={() => removePlace(place.id)}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            <p className="game-editor__hint">
              Откройте место, чтобы отметить, с какими местами оно связано. Пути двусторонние:
              связь сразу появится у второго места. У выхода можно выбрать карту, на которую
              он ведёт.
            </p>
          </section>

          {error ? <p className="notice notice--error">{error}</p> : null}
        </form>
      </Modal>

      <PlaceFormModal
        open={editingPlace !== null}
        place={editingPlace}
        otherPlaces={otherPlaces}
        connectedIds={editingConnections}
        otherMaps={otherMaps}
        onClose={() => setEditingPlaceId(null)}
        onSave={savePlace}
      />
    </>
  )
}
