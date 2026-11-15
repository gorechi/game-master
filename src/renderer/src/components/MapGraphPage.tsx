import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { JSX, PointerEvent as ReactPointerEvent } from 'react'
import type { GameMap, MapPath } from '@shared/map'
import type { Realm } from '@shared/realm'
import type { PlaceType } from '@shared/placeType'
import { canonicalMapPath } from '@shared/domain'
import { api, errorMessage } from '@renderer/lib/api'
import { pluralize } from '@renderer/lib/format'
import { editorLayout, type MapPoint } from '@renderer/lib/mapLayout'
import { IconPencil, IconSave, IconUndo } from './ui/icons'
import { MapExitFrame } from './maps/MapExitFrame'
import { MapFormModal } from './maps/MapFormModal'
import { MapGraph } from './maps/MapGraph'

interface MapGraphPageProps {
  mapId: string
  realms: readonly Realm[]
  onBack: () => void
  onOpenMap: (mapId: string) => void
}

const MIN_ZOOM = 0.2
const MAX_ZOOM = 1.6
const WHEEL_ZOOM_SPEED = 0.0015

interface PanState {
  pointerId: number
  startX: number
  startY: number
  scrollLeft: number
  scrollTop: number
}

interface ZoomAnchor {
  canvasX: number
  canvasY: number
  cursorX: number
  cursorY: number
}

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100))
}

function centerScrollElement(element: HTMLDivElement): void {
  element.scrollLeft = Math.max(0, (element.scrollWidth - element.clientWidth) / 2)
  element.scrollTop = Math.max(0, (element.scrollHeight - element.clientHeight) / 2)
}

function centerScrollOnNodes(
  element: HTMLDivElement,
  nodes: readonly { x: number; y: number }[],
  zoom: number
): void {
  if (nodes.length === 0) {
    centerScrollElement(element)
    return
  }

  const xs = nodes.map((node) => node.x)
  const ys = nodes.map((node) => node.y)
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2

  element.scrollLeft = Math.max(0, centerX * zoom - element.clientWidth / 2)
  element.scrollTop = Math.max(0, centerY * zoom - element.clientHeight / 2)
}

/** Просмотр и редактирование карты: большое рабочее поле с масштабом. */
export function MapGraphPage({
  mapId,
  realms,
  onBack,
  onOpenMap
}: MapGraphPageProps): JSX.Element {
  const [map, setMap] = useState<GameMap | null | undefined>(undefined)
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>([])
  const [linkedMapNames, setLinkedMapNames] = useState<Record<string, string>>({})
  const [positions, setPositions] = useState<Record<string, MapPoint> | null>(null)
  const [draftPaths, setDraftPaths] = useState<MapPath[] | null>(null)
  const [savingChanges, setSavingChanges] = useState(false)
  const [changeError, setChangeError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [panning, setPanning] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(1)
  const targetZoomRef = useRef(1)
  const zoomCommitScheduledRef = useRef(false)
  const centerTargetRef = useRef<{
    nodes: readonly { x: number; y: number }[]
    zoom: number
  } | null>(null)
  const panRef = useRef<PanState | null>(null)
  const zoomAnchorRef = useRef<ZoomAnchor | null>(null)
  const centeredMapRef = useRef<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    try {
      const maps = await api.maps.list()
      const found = maps.find((item) => item.id === mapId) ?? null
      const nextPlaceTypes = found ? await api.placeTypes.list(found.realmId) : []

      setMap(found)
      setPlaceTypes(nextPlaceTypes)
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



  useEffect(() => {
    zoomRef.current = 1
    targetZoomRef.current = 1
    zoomAnchorRef.current = null
    setZoom(1)
  }, [mapId])

  // Колесо мыши меняет масштаб. События за один кадр схлопываются в одно
  // обновление, а прокрутку двигает layout-effect — поэтому карта не прыгает.
  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    const onWheel = (event: WheelEvent): void => {
      if (event.deltaY === 0) return
      event.preventDefault()

      const displayed = zoomRef.current
      const rect = element.getBoundingClientRect()
      const cursorX = event.clientX - rect.left
      const cursorY = event.clientY - rect.top

      zoomAnchorRef.current = {
        canvasX: (element.scrollLeft + cursorX) / displayed,
        canvasY: (element.scrollTop + cursorY) / displayed,
        cursorX,
        cursorY
      }

      targetZoomRef.current = clampZoom(
        targetZoomRef.current * Math.exp(-event.deltaY * WHEEL_ZOOM_SPEED)
      )

      if (zoomCommitScheduledRef.current) return
      zoomCommitScheduledRef.current = true

      queueMicrotask(() => {
        zoomCommitScheduledRef.current = false
        const next = targetZoomRef.current
        if (next === zoomRef.current) return

        zoomRef.current = next
        setZoom(next)
      })
    }

    element.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      element.removeEventListener('wheel', onWheel)
    }
  }, [map?.id])

  useLayoutEffect(() => {
    const element = scrollRef.current
    if (!element) return

    const centerTarget = centerTargetRef.current
    if (centerTarget) {
      centerTargetRef.current = null
      zoomAnchorRef.current = null
      centerScrollOnNodes(element, centerTarget.nodes, zoom)
      return
    }

    const anchor = zoomAnchorRef.current
    if (!anchor) return

    zoomAnchorRef.current = null
    element.scrollLeft = anchor.canvasX * zoom - anchor.cursorX
    element.scrollTop = anchor.canvasY * zoom - anchor.cursorY
  }, [zoom])


  const layout = map ? editorLayout(map, positions ?? undefined) : null
  const displayPaths = draftPaths ?? map?.paths ?? []
  const dirty = positions !== null || draftPaths !== null

  // Один раз при открытии карты показываем её содержимое, а не пустой угол поля.
  useLayoutEffect(() => {
    const element = scrollRef.current
    if (!element || !map || !layout) return
    if (centeredMapRef.current === map.id) return

    centeredMapRef.current = map.id
    centerScrollOnNodes(element, layout.nodes, zoomRef.current)
  }, [layout, map])

  function moveNode(placeId: string, x: number, y: number): void {
    if (!layout) return

    setPositions((current) => {
      const base =
        current ??
        Object.fromEntries(layout.nodes.map((node) => [node.id, { x: node.x, y: node.y }]))

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
        places: map.places.map((place) => {
          const position = positions?.[place.id]

          return {
            ...place,
            x: position ? Math.max(0, Math.round(position.x)) : place.x,
            y: position ? Math.max(0, Math.round(position.y)) : place.y
          }
        }),
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

  function resetZoom(): void {
    const wasZoom = zoomRef.current
    const nodes = layout?.nodes ?? []
    zoomRef.current = 1
    targetZoomRef.current = 1
    zoomAnchorRef.current = null

    if (wasZoom !== 1) {
      centerTargetRef.current = { nodes, zoom: 1 }
      setZoom(1)
      return
    }

    const element = scrollRef.current
    if (element) centerScrollOnNodes(element, nodes, 1)
  }

  function startPan(event: ReactPointerEvent<HTMLDivElement>): void {
    if (event.button !== 0) return

    const target = event.target
    if (target instanceof Element && target.closest('.map-node')) return

    const viewport = event.currentTarget
    event.preventDefault()

    try {
      viewport.setPointerCapture(event.pointerId)
    } catch {
      // Синтетические события в тестах могут не иметь активного pointer id.
    }

    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop
    }
    setPanning(true)
  }

  function movePan(event: ReactPointerEvent<HTMLDivElement>): void {
    const pan = panRef.current
    if (!pan || pan.pointerId !== event.pointerId) return

    event.preventDefault()
    event.currentTarget.scrollLeft = pan.scrollLeft - (event.clientX - pan.startX)
    event.currentTarget.scrollTop = pan.scrollTop - (event.clientY - pan.startY)
  }

  function endPan(event: ReactPointerEvent<HTMLDivElement>): void {
    const pan = panRef.current
    if (!pan || pan.pointerId !== event.pointerId) return

    panRef.current = null
    setPanning(false)

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

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
                    <MapExitFrame strokeWidth={3.4} />
                  </span>
                  Выход на другую карту
                </span>
              </div>

              <div className="map-graph-actions">
                <div className="map-zoom">
                  <span className="map-zoom__hint">Колесо — масштаб</span>
                  <button
                    type="button"
                    className="map-zoom__value"
                    title="Сбросить масштаб"
                    aria-label="Сбросить масштаб карты"
                    onClick={resetZoom}
                  >
                    {Math.round(zoom * 100)}%
                  </button>
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
            </div>

            <div
              ref={scrollRef}
              className={`map-graph-scroll${panning ? ' map-graph-scroll--panning' : ''}`}
              onPointerDown={startPan}
              onPointerMove={movePan}
              onPointerUp={endPan}
              onPointerCancel={endPan}
            >
              {layout ? (
                <div
                  className="map-graph-fit"
                  style={{
                    width: layout.width * zoom,
                    height: layout.height * zoom
                  }}
                >
                  <div
                    className="map-graph-scale"
                    style={{
                      width: layout.width,
                      height: layout.height,
                      transform: `scale(${zoom})`
                    }}
                  >
                    <MapGraph
                      mapName={map.name}
                      paths={displayPaths}
                      layout={layout}
                      placeTypes={placeTypes}
                      linkedMapNames={linkedMapNames}
                      onOpenMap={onOpenMap}
                      onMoveNode={moveNode}
                      onConnect={connectNodes}
                      scale={zoom}
                      showCanvas
                    />
                  </div>
                  <div className="map-graph-boundary" aria-hidden="true" />
                </div>
              ) : null}
            </div>
          </section>
        )}
      </div>

      <MapFormModal
        open={editing}
        map={map ?? null}
        realms={realms}
        defaultRealmId={map?.realmId ?? ''}
        onClose={() => setEditing(false)}
        onSaved={(saved) => {
          setMap(saved)
          setPositions(null)
          setDraftPaths(null)
          setChangeError(null)
          setEditing(false)
          void load()
        }}
      />
    </main>
  )
}
