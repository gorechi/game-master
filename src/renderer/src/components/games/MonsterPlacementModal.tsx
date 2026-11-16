import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { GameMap } from '@shared/map'
import { useI18n } from '@renderer/i18n/LocaleProvider'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'

interface MonsterPlacementModalProps {
  open: boolean
  monsterName: string
  /** Игровая карта и все карты, до которых можно дойти по выходам. */
  maps: readonly GameMap[]
  initialMapId: string
  initialPlaceId: string
  onClose: () => void
  onSave: (mapId: string, placeId: string) => void
}

/**
 * Временное размещение монстра на карте.
 * Результат остаётся только в форме игры и не записывается в монстра.
 */
export function MonsterPlacementModal({
  open,
  monsterName,
  maps,
  initialMapId,
  initialPlaceId,
  onClose,
  onSave
}: MonsterPlacementModalProps): JSX.Element {
  const { messages: m, fill } = useI18n()
  const [mapId, setMapId] = useState('')
  const [placeId, setPlaceId] = useState('')

  useEffect(() => {
    if (!open) return

    const fallbackMapId = maps.some((map) => map.id === initialMapId)
      ? initialMapId
      : (maps[0]?.id ?? '')
    const map = maps.find((item) => item.id === fallbackMapId)
    const nextPlaceId = map?.places.some((place) => place.id === initialPlaceId)
      ? initialPlaceId
      : ''

    setMapId(fallbackMapId)
    setPlaceId(nextPlaceId)
    // Начальные значения нужны только в момент открытия.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const selectedMap = maps.find((map) => map.id === mapId)
  const places = selectedMap?.places ?? []
  const placeOptions = places.map((place) => ({ value: place.id, label: place.name }))

  return (
    <Modal
      open={open}
      title={m.games.placement.title}
      description={fill(m.games.placement.description, { name: monsterName })}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button" onClick={onClose}>
            {m.games.placement.cancel}
          </button>
          <button
            type="button"
            className="button button--primary"
            disabled={!mapId || !placeId}
            onClick={() => onSave(mapId, placeId)}
          >
            {m.games.placement.save}
          </button>
        </>
      }
    >
      <div className="monster-placement">
        <label className="field">
          <span className="field__label">{m.games.placement.mapLabel}</span>
          <Select<string>
            value={mapId}
            options={maps.map((map) => ({ value: map.id, label: map.name }))}
            onChange={(value) => {
              setMapId(value)
              setPlaceId('')
            }}
            ariaLabel={m.games.placement.mapAria}
            placeholder={m.games.placement.mapPlaceholder}
            searchable={maps.length > 8}
          />
        </label>

        <label className="field">
          <span className="field__label">{m.games.placement.placeLabel}</span>
          <Select<string>
            value={placeId}
            options={placeOptions}
            onChange={setPlaceId}
            ariaLabel={m.games.placement.placeAria}
            placeholder={
              mapId ? m.games.placement.placePlaceholder : m.games.placement.chooseMapFirst
            }
            disabled={!mapId || placeOptions.length === 0}
            searchable={placeOptions.length > 8}
          />
        </label>

        {selectedMap && places.length === 0 ? (
          <p className="notice">{m.games.placement.noPlaces}</p>
        ) : null}

        <p className="game-editor__hint">{m.games.placement.hint}</p>
      </div>
    </Modal>
  )
}
