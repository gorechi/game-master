import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, JSX } from 'react'
import type { GameMap, MapPath, MapPlace } from '@shared/map'
import type { PlaceType } from '@shared/placeType'
import type { Realm } from '@shared/realm'
import {
  connectedPlaceIds,
  createMapPlace,
  placePaths,
  setPlaceConnections
} from '@shared/domain'
import { api, errorMessage } from '@renderer/lib/api'
import { pluralize } from '@renderer/lib/format'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { IconPencil, IconPlus, IconTrash } from '../ui/icons'
import { PlaceTypeIcon } from '../placeTypes/PlaceTypeIcon'
import { PlaceFormModal } from './PlaceFormModal'

interface MapFormModalProps {
  open: boolean
  map: GameMap | null
  realms: readonly Realm[]
  /** Сеттинг по умолчанию: выбранный фильтр или сеттинг редактируемой карты. */
  defaultRealmId: string
  onClose: () => void
  onSaved: (map: GameMap) => void
}

/** Создание и редактирование карты: сеттинг, название, места и пути между ними. */
export function MapFormModal({
  open,
  map,
  realms,
  defaultRealmId,
  onClose,
  onSaved
}: MapFormModalProps): JSX.Element {
  const [name, setName] = useState('')
  const [realmId, setRealmId] = useState('')
  const [places, setPlaces] = useState<MapPlace[]>([])
  const [paths, setPaths] = useState<MapPath[]>([])
  const [otherMaps, setOtherMaps] = useState<GameMap[]>([])
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>([])
  const [placeName, setPlaceName] = useState('')
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const formId = useId()

  useEffect(() => {
    if (!open) return

    setName(map?.name ?? '')
    setRealmId(map?.realmId ?? defaultRealmId)
    setPlaces(map?.places ?? [])
    setPaths(map?.paths ?? [])
    setOtherMaps([])
    setPlaceTypes([])
    setPlaceName('')
    setEditingPlaceId(null)
    setError(null)
    setSaving(false)
    window.setTimeout(() => nameRef.current?.focus(), 0)
  }, [open, map, defaultRealmId])

  useEffect(() => {
    if (!open || !realmId) {
      setOtherMaps([])
      setPlaceTypes([])
      return
    }

    let cancelled = false

    void Promise.all([api.maps.list(realmId), api.placeTypes.list(realmId)])
      .then(([maps, types]) => {
        if (cancelled) return
        setOtherMaps(maps.filter((item) => item.id !== map?.id))
        setPlaceTypes(types)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(errorMessage(caught))
      })

    return () => {
      cancelled = true
    }
  }, [open, realmId, map?.id])

  function changeRealm(nextRealmId: string): void {
    setRealmId(nextRealmId)
    // Иконки принадлежат сеттингу: при его смене все места теряют иконку.
    setPlaces((current) =>
      current.map((place) => (place.placeTypeId ? { ...place, placeTypeId: null } : place))
    )
    setError(null)
  }

  const editingPlace = editingPlaceId
    ? (places.find((place) => place.id === editingPlaceId) ?? null)
    : null
  const otherPlaces = editingPlace
    ? places.filter((place) => place.id !== editingPlace.id)
    : []
  const editingConnections = editingPlace ? connectedPlaceIds(paths, editingPlace.id) : []

  function addPlace(): void {
    const trimmed = placeName.trim()
    if (!trimmed || !realmId) return

    const place = createMapPlace(trimmed)
    setPlaces((current) => [...current, place])
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
    placeTypeId: string | null
    connectedIds: string[]
  }): void {
    if (!editingPlace) return

    const placeTypeId =
      input.placeTypeId && placeTypes.some((placeType) => placeType.id === input.placeTypeId)
        ? input.placeTypeId
        : null

    setPlaces((current) =>
      current.map((place) =>
        place.id === editingPlace.id
          ? {
              ...place,
              name: input.name,
              isExit: input.isExit,
              linkedMapId: input.linkedMapId,
              placeTypeId
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

    if (!realmId) {
      setError('Выберите сеттинг карты')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const input = { name: trimmed, realmId, places, paths }
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

          <div className="field">
            <span className="field__label">Сеттинг *</span>
            <Select
              ariaLabel="Сеттинг карты"
              value={realmId}
              placeholder="Выберите сеттинг"
              disabled={realms.length === 0}
              options={realms.map((realm) => ({ value: realm.id, label: realm.name }))}
              onChange={changeRealm}
            />
            <p className="game-editor__hint">
              Карта принадлежит выбранному сеттингу. При смене сеттинга иконки всех мест
              сбрасываются.
            </p>
          </div>

          {realms.length === 0 ? (
            <p className="notice notice--error">
              Нет доступных сеттингов. Создайте сеттинг, чтобы добавлять карты.
            </p>
          ) : null}

          {map && realmId && realmId !== map.realmId && map.places.some((place) => place.placeTypeId) ? (
            <p className="notice notice--error">
              При сохранении карты в другом сеттинге иконки всех мест будут сброшены.
            </p>
          ) : null}

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
                placeholder={realmId ? 'Название нового места' : 'Сначала выберите сеттинг'}
                autoComplete="off"
                disabled={!realmId}
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
                disabled={!realmId || !placeName.trim()}
              >
                <IconPlus width={15} height={15} />
                Добавить место
              </button>
            </div>

            <p className="game-editor__hint">
              Иконка выбирается в карточке места — нажмите на карандаш рядом с названием.
            </p>

            {places.length === 0 ? (
              <div className="map-place-list map-place-list--empty">
                <p>Пока ни одного места. Добавьте первое — с него начнётся карта.</p>
              </div>
            ) : (
              <ul className="map-place-list">
                {places.map((place) => {
                  const links = placePaths(paths, place.id).length
                  const linkedName = linkedMapName(place.linkedMapId)
                  const placeType = place.placeTypeId
                    ? placeTypes.find((item) => item.id === place.placeTypeId)
                    : undefined

                  return (
                    <li key={place.id} className="map-place-row">
                      <span className="map-place-row__name">{place.name}</span>
                      {placeType ? (
                        <span className="place-type-choice__icon" title="Иконка места">
                          <PlaceTypeIcon svg={placeType.iconSvg} size={14} />
                        </span>
                      ) : null}
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
        placeTypes={placeTypes}
        onClose={() => setEditingPlaceId(null)}
        onSave={savePlace}
      />
    </>
  )
}
