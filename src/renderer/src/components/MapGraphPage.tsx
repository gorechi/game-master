import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { GameMap } from '@shared/map'
import { api, errorMessage } from '@renderer/lib/api'
import { pluralize } from '@renderer/lib/format'
import { IconPencil } from './ui/icons'
import { MapFormModal } from './maps/MapFormModal'
import { MapGraph } from './maps/MapGraph'

interface MapGraphPageProps {
  mapId: string
  onBack: () => void
  onOpenMap: (mapId: string) => void
}

/** Просмотр карты: граф мест и путей. */
export function MapGraphPage({ mapId, onBack, onOpenMap }: MapGraphPageProps): JSX.Element {
  const [map, setMap] = useState<GameMap | null | undefined>(undefined)
  const [linkedMapNames, setLinkedMapNames] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    try {
      const maps = await api.maps.list()
      setMap(maps.find((item) => item.id === mapId) ?? null)
      setLinkedMapNames(Object.fromEntries(maps.map((item) => [item.id, item.name])))
      setError(null)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }, [mapId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <main className="page">
      <div className="page__inner">
        <div className="page-block">
          <button
            type="button"
            className="button button--ghost button--tiny page-back"
            onClick={onBack}
          >
            ← Карты
          </button>

          <header className="page-head">
            <div>
              <p className="page-kicker">Карта</p>
              <h1>{map ? map.name : 'Карта'}</h1>
              <p className="muted">
                {map
                  ? `${map.places.length} ${pluralize(
                      map.places.length,
                      'место',
                      'места',
                      'мест'
                    )} · ${map.paths.length} ${pluralize(
                      map.paths.length,
                      'путь',
                      'пути',
                      'путей'
                    )}`
                  : 'Загружаем карту…'}
              </p>
            </div>

            {map ? (
              <div className="map-view-actions">
                <button className="button" onClick={() => setEditing(true)}>
                  <IconPencil width={15} height={15} />
                  Редактировать
                </button>
              </div>
            ) : null}
          </header>
        </div>

        {error ? <p className="notice notice--error">{error}</p> : null}

        {map === null ? (
          <div className="empty">
            <p>Карта не найдена — возможно, запись уже удалена.</p>
            <button className="button" onClick={onBack}>
              Вернуться к картам
            </button>
          </div>
        ) : map === undefined ? (
          <p className="muted">Загружаем карту…</p>
        ) : (
          <section className="map-graph-card">
            <div className="map-graph-card__legend">
              <span>
                <i className="map-legend__line" aria-hidden="true" />
                Путь между местами
              </span>
              <span>
                <span className="map-badge">Выход</span>
                Выход на другую карту
              </span>
            </div>

            <div className="map-graph-scroll">
              <MapGraph
                map={map}
                linkedMapNames={linkedMapNames}
                onOpenMap={onOpenMap}
              />
            </div>
          </section>
        )}
      </div>

      <MapFormModal
        open={editing}
        map={map ?? null}
        onClose={() => setEditing(false)}
        onSaved={(saved) => {
          setMap(saved)
          setEditing(false)
          setLinkedMapNames((current) => ({ ...current, [saved.id]: saved.name }))
        }}
      />
    </main>
  )
}
