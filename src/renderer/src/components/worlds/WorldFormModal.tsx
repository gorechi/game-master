import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, JSX } from 'react'
import type { World, WorldPath, WorldPlace } from '@shared/world'
import {
  connectedPlaceIds,
  createWorldPlace,
  placePaths,
  setPlaceConnections
} from '@shared/domain'
import { api, errorMessage } from '@renderer/lib/api'
import { pluralize } from '@renderer/lib/format'
import { Modal } from '../ui/Modal'
import { IconPencil, IconPlus, IconTrash } from '../ui/icons'
import { PlaceFormModal } from './PlaceFormModal'

interface WorldFormModalProps {
  open: boolean
  world: World | null
  onClose: () => void
  onSaved: (world: World) => void
}

/** Создание и редактирование сеттинга: название, места и пути между ними. */
export function WorldFormModal({
  open,
  world,
  onClose,
  onSaved
}: WorldFormModalProps): JSX.Element {
  const [name, setName] = useState('')
  const [places, setPlaces] = useState<WorldPlace[]>([])
  const [paths, setPaths] = useState<WorldPath[]>([])
  const [placeName, setPlaceName] = useState('')
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const formId = useId()

  useEffect(() => {
    if (!open) return

    setName(world?.name ?? '')
    setPlaces(world?.places ?? [])
    setPaths(world?.paths ?? [])
    setPlaceName('')
    setEditingPlaceId(null)
    setError(null)
    setSaving(false)
    window.setTimeout(() => nameRef.current?.focus(), 0)
  }, [open, world])

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

    setPlaces((current) => [...current, createWorldPlace(trimmed)])
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
    connectedIds: string[]
  }): void {
    if (!editingPlace) return

    setPlaces((current) =>
      current.map((place) =>
        place.id === editingPlace.id
          ? { ...place, name: input.name, isExit: input.isExit }
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
      setError('Укажите название сеттинга')
      nameRef.current?.focus()
      return
    }

    setSaving(true)
    setError(null)

    try {
      const input = { name: trimmed, places, paths }
      const saved = world
        ? await api.worlds.update({ ...world, ...input })
        : await api.worlds.create(input)

      onSaved(saved)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Modal
        open={open}
        title={world ? 'Редактировать сеттинг' : 'Новый сеттинг'}
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
              {saving ? 'Сохраняем…' : 'Сохранить сеттинг'}
            </button>
          </>
        }
      >
        <form id={formId} className="world-editor" onSubmit={(event) => void submit(event)}>
          <label className="field">
            <span className="field__label">Название сеттинга</span>
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

            <div className="world-add-place">
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
              <div className="world-place-list world-place-list--empty">
                <p>Пока ни одного места. Добавьте первое — с него начнётся карта.</p>
              </div>
            ) : (
              <ul className="world-place-list">
                {places.map((place) => {
                  const links = placePaths(paths, place.id).length

                  return (
                    <li key={place.id} className="world-place-row">
                      <span className="world-place-row__name">{place.name}</span>
                      {place.isExit ? <span className="world-badge">Выход</span> : null}
                      <span className="world-place-row__meta">
                        {links} {pluralize(links, 'путь', 'пути', 'путей')}
                      </span>

                      <div className="world-place-row__actions">
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
              связь сразу появится у второго места.
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
        onClose={() => setEditingPlaceId(null)}
        onSave={savePlace}
      />
    </>
  )
}
