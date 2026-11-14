import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { GameMap, MapPath } from '@shared/map'
import { canonicalMapPath } from '@shared/domain'
import { api, errorMessage } from '@renderer/lib/api'
import { pluralize } from '@renderer/lib/format'
import { layoutMap, type MapPoint } from '@renderer/lib/mapLayout'
import { IconPencil, IconSave, IconStoneArch, IconUndo } from './ui/icons'
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
  const [positions, setPositions] = useState<Record<string, MapPoint> | null>(null)
  const [draftPaths, setDraftPaths] = useState<MapPath[] | null>(null)
  const [savingChanges, setSavingChanges] = useState(false)
  const [changeError, setChangeError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    try {
      const maps = await api.maps.list()
      setMap(maps.find((item) => item.id === mapId) ?? null)
      setLinkedMapNames(Object.fromEntries(maps.map((item) => [item.id, item.name])))
      setPositions(null)
      setDraftPaths(null)
      setChangeError(null)
      setError(null)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }, [mapId])

  useEffect(() => {
    void load()
  }, [load])

  function moveNode(placeId: string, x: number, y: number): void {
    if (!map) return

    setPositions((current) => {
      const base =
        current ??
        Object.fromEntries(
          layoutMap(map).nodes.map((node) => [node.id, { x: node.x, y: node.y }])
        )

      return { ...base, [placeId]: { x, y } }
    })
    setChangeError(null)
  }

  function connectNodes(fromId: string, toId: string): void {
    if (!map || fromId === toId) return

    const current = draftPaths ?? map.paths
    const exists = current.some(
      (path) =>
        (path.a === fromId && path.b === toId) || (path.a === toId && path.b === fromId)
    )

    if (exists) return

    setDraftPaths([...current, canonicalMapPath(fromId, toId)])
    setChangeError(null)
  }

  async function saveChanges(): Promise<void> {
    if (!map || (!positions && !draftPaths)) return

    setSavingChanges(true)
    setChangeError(null)

    try {
      const updated = await api.maps.update({
        ...map,
        places: map.places.map((place) => ({
          ...place,
          x: positions?.[place.id]?.x ?? place.x,
          y: positions?.[place.id]?.y ?? place.y
        })),
        paths: draftPaths ?? map.paths
      })

      setMap(updated)
      setPositions(null)
      setDraftPaths(null)
    } catch (caught) {
      setChangeError(errorMessage(caught))
    } finally {
      setSavingChanges(false)
    }
  }

  function resetChanges(): void {
    setPositions(null)
    setDraftPaths(null)
    setChangeError(null)
  }

  const layout = map ? layoutMap(map, positions ?? undefined) : null
  const displayPaths = draftPaths ?? map?.paths ?? []
  const dirty = positions !== null || draftPaths !== null

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
                    )} · ${displayPaths.length} ${pluralize(
                      displayPaths.length,
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
        {changeError ? <p className="notice notice--error">{changeError}</p> : null}

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
            <div className="map-graph-card__bar">
              <div className="map-graph-card__legend">
                <span>
                  <i className="map-legend__line" aria-hidden="true" />
                  Путь между местами
                </span>
                <span>
                  <span className="map-exit-mark" aria-hidden="true">
                    <IconStoneArch width={13} height={13} />
                  </span>
                  Выход на другую карту
                </span>
              </div>

              {dirty ? (
                <div className="map-graph-tools">
                  <button
                    type="button"
                    className="icon-button map-tool map-tool--save"
                    title="Сохранить изменения"
                    aria-label="Сохранить изменения карты"
                    onClick={() => void saveChanges()}
                    disabled={savingChanges}
                  >
                    <IconSave width={15} height={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-button map-tool"
                    title="Сбросить изменения"
                    aria-label="Вернуть сохранённое состояние карты"
                    onClick={resetChanges}
                    disabled={savingChanges}
                  >
                    <IconUndo width={15} height={15} />
                  </button>
                </div>
              ) : null}
            </div>

            <div className="map-graph-scroll">
              {layout ? (
                <MapGraph
                  mapName={map.name}
                  paths={displayPaths}
                  layout={layout}
                  linkedMapNames={linkedMapNames}
                  onOpenMap={onOpenMap}
                  onMoveNode={moveNode}
                  onConnect={connectNodes}
                />
              ) : null}
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
          setPositions(null)
          setDraftPaths(null)
          setChangeError(null)
          setEditing(false)
          setLinkedMapNames((current) => ({ ...current, [saved.id]: saved.name }))
        }}
      />
    </main>
  )
}
