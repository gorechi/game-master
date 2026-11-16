import { useRef, useState } from 'react'
import type { JSX, KeyboardEvent, PointerEvent } from 'react'
import type { MapPath } from '@shared/map'
import type { PlaceType } from '@shared/placeType'
import { mapPathKey } from '@shared/domain'
import { useI18n } from '@renderer/i18n/LocaleProvider'
import {
  MAP_GRAPH_PADDING,
  MAP_NODE_HEIGHT,
  MAP_NODE_WIDTH,
  type MapLayout,
  type MapNodePosition
} from '@renderer/lib/mapLayout'
import { PlaceTypeIcon } from '../placeTypes/PlaceTypeIcon'
import { IconMonsterFace, IconNote } from '../ui/icons'
import { MapExitFrame } from './MapExitFrame'

const DRAG_THRESHOLD = 4

function nodeInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

interface DragState {
  id: string
  pointerId: number
  startClientX: number
  startClientY: number
  originX: number
  originY: number
  moved: boolean
}

interface ConnectionDraft {
  fromId: string
  pointerId: number
  x: number
  y: number
  targetId: string | null
}

function hashPair(path: MapPath): number {
  const key = mapPathKey(path)
  let hash = 0

  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) | 0
  }

  return hash
}

function edgeAnchor(from: MapNodePosition, point: { x: number; y: number }): { x: number; y: number } {
  const dx = point.x - from.x
  const dy = point.y - from.y
  const length = Math.hypot(dx, dy)

  if (length < 0.001) {
    return { x: from.x, y: from.y }
  }

  const radius = MAP_NODE_WIDTH / 2 - 8
  return {
    x: from.x + (dx / length) * radius,
    y: from.y + (dy / length) * radius
  }
}

function anchorPoint(from: MapNodePosition, to: MapNodePosition): { x: number; y: number } {
  return edgeAnchor(from, to)
}

function edgePath(from: MapNodePosition, to: MapNodePosition): string {
  const start = anchorPoint(from, to)
  const end = anchorPoint(to, from)
  const dx = end.x - start.x
  const dy = end.y - start.y
  const middleX = (start.x + end.x) / 2
  const middleY = (start.y + end.y) / 2
  const direction = hashPair({ a: from.id, b: to.id }) % 2 === 0 ? 1 : -1
  const bend = 0.07 * direction
  const controlX = middleX - dy * bend
  const controlY = middleY + dx * bend

  return `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`
}

function previewPath(from: MapNodePosition, point: { x: number; y: number }): string {
  const start = edgeAnchor(from, point)
  return `M ${start.x} ${start.y} Q ${(start.x + point.x) / 2} ${(start.y + point.y) / 2} ${point.x} ${point.y}`
}

interface MapGraphProps {
  mapName: string
  paths: readonly MapPath[]
  layout: MapLayout
  /** Иконки мест сеттинга: по placeTypeId выбирается картинка жетона. */
  placeTypes: readonly PlaceType[]
  /** Названия других карт по id — для подписи выхода. */
  linkedMapNames: Record<string, string>
  /** Имена живых монстров по id места — только на экране проведения. */
  monsterNamesByPlace?: Record<string, readonly string[]>
  onOpenPlaceMonsters?: (placeId: string) => void
  /** Места, у которых есть описание. */
  descriptionPlaceIds?: ReadonlySet<string>
  onOpenPlaceDescription?: (placeId: string) => void
  onOpenMap: (mapId: string) => void
  onMoveNode: (placeId: string, x: number, y: number) => void
  onConnect: (fromId: string, toId: string) => void
  /** Двойной клик по пути в режиме редактирования удаляет его. */
  onDisconnect?: (fromId: string, toId: string) => void
  /** В режиме проведения карта только для чтения. */
  interactive?: boolean
  /** Масштаб отображения: координаты указателя переводятся обратно в координаты раскладки. */
  scale?: number
  /** Показывать фон рабочего поля с сеткой. */
  showCanvas?: boolean
}

/** Графическое представление карты: места-жетоны и пути-дорожки. */
export function MapGraph({
  mapName,
  paths,
  layout,
  placeTypes,
  linkedMapNames,
  monsterNamesByPlace,
  onOpenPlaceMonsters,
  descriptionPlaceIds,
  onOpenPlaceDescription,
  onOpenMap,
  onMoveNode,
  onConnect,
  onDisconnect,
  interactive = true,
  scale = 1,
  showCanvas = false
}: MapGraphProps): JSX.Element {
  const { messages: m, fill } = useI18n()
  const dragRef = useRef<DragState | null>(null)
  const connectionRef = useRef<ConnectionDraft | null>(null)
  const graphRef = useRef<HTMLDivElement>(null)
  const lastPointerOpenRef = useRef(0)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [connection, setConnection] = useState<ConnectionDraft | null>(null)

  function openLinkedMap(node: MapNodePosition): void {
    if (!node.linkedMapId) return
    lastPointerOpenRef.current = Date.now()
    onOpenMap(node.linkedMapId)
  }

  function onLinkedClick(node: MapNodePosition): void {
    if (Date.now() - lastPointerOpenRef.current < 500) return
    openLinkedMap(node)
  }

  if (layout.nodes.length === 0) {
    return (
      <div className="map-graph-empty">
        <p>{m.maps.graph.emptyTitle}</p>
        <span>{m.maps.graph.emptyHint}</span>
      </div>
    )
  }

  const nodesById = new Map(layout.nodes.map((node) => [node.id, node]))
  const placeTypeById = new Map(placeTypes.map((placeType) => [placeType.id, placeType]))
  const edges: { key: string; from: MapNodePosition; to: MapNodePosition }[] = []

  for (const path of paths) {
    const from = nodesById.get(path.a)
    const to = nodesById.get(path.b)

    if (!from || !to) continue

    edges.push({ key: mapPathKey(path), from, to })
  }

  const minX = MAP_NODE_WIDTH / 2 + MAP_GRAPH_PADDING
  const maxX = Math.max(minX, layout.width - MAP_NODE_WIDTH / 2 - MAP_GRAPH_PADDING)
  const minY = MAP_NODE_HEIGHT / 2 + MAP_GRAPH_PADDING
  const maxY = Math.max(minY, layout.height - MAP_NODE_HEIGHT / 2 - MAP_GRAPH_PADDING)

  function onPointerDown(event: PointerEvent<HTMLDivElement>, node: MapNodePosition): void {
    if (event.button !== 0) return

    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Синтетические события в тестах могут не иметь активного pointer id.
    }
    dragRef.current = {
      id: node.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX: node.x,
      originY: node.y,
      moved: false
    }
    setDraggingId(node.id)
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const dx = (event.clientX - drag.startClientX) / scale
    const dy = (event.clientY - drag.startClientY) / scale

    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    drag.moved = true

    const x = Math.min(maxX, Math.max(minX, drag.originX + dx))
    const y = Math.min(maxY, Math.max(minY, drag.originY + dy))
    onMoveNode(drag.id, Math.round(x), Math.round(y))
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>, node: MapNodePosition): void {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const moved = drag.moved
    dragRef.current = null
    setDraggingId(null)

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (!moved && node.isExit && node.linkedMapId) {
      onOpenMap(node.linkedMapId)
    }
  }

  function cancelDrag(event: PointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    dragRef.current = null
    setDraggingId(null)

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function graphPoint(event: PointerEvent<HTMLElement>): { x: number; y: number } | null {
    const rect = graphRef.current?.getBoundingClientRect()
    if (!rect) return null

    return {
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale
    }
  }

  function nodeIdAt(clientX: number, clientY: number): string | null {
    const element = document.elementFromPoint(clientX, clientY)
    const node = element?.closest<HTMLElement>('[data-map-node-id]')
    return node?.dataset.mapNodeId ?? null
  }

  function startConnection(
    event: PointerEvent<HTMLSpanElement>,
    node: MapNodePosition
  ): void {
    if (event.button !== 0) return

    event.preventDefault()
    event.stopPropagation()

    const point = graphPoint(event)
    if (!point) return

    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Синтетические события в тестах могут не иметь активного pointer id.
    }

    const draft: ConnectionDraft = {
      fromId: node.id,
      pointerId: event.pointerId,
      x: point.x,
      y: point.y,
      targetId: null
    }

    connectionRef.current = draft
    setConnection(draft)
  }

  function moveConnection(event: PointerEvent<HTMLSpanElement>): void {
    const draft = connectionRef.current
    if (!draft || draft.pointerId !== event.pointerId) return

    event.preventDefault()
    event.stopPropagation()

    const point = graphPoint(event)
    if (!point) return

    const hovered = nodeIdAt(event.clientX, event.clientY)
    const next: ConnectionDraft = {
      ...draft,
      x: point.x,
      y: point.y,
      targetId: hovered && hovered !== draft.fromId ? hovered : null
    }

    connectionRef.current = next
    setConnection(next)
  }

  function finishConnection(event: PointerEvent<HTMLSpanElement>): void {
    const draft = connectionRef.current
    if (!draft || draft.pointerId !== event.pointerId) return

    event.preventDefault()
    event.stopPropagation()

    const targetId = nodeIdAt(event.clientX, event.clientY)
    if (targetId && targetId !== draft.fromId) {
      onConnect(draft.fromId, targetId)
    }

    connectionRef.current = null
    setConnection(null)

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function cancelConnection(event: PointerEvent<HTMLSpanElement>): void {
    const draft = connectionRef.current
    if (!draft || draft.pointerId !== event.pointerId) return

    connectionRef.current = null
    setConnection(null)

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const connectionSource = connection ? nodesById.get(connection.fromId) : undefined

  function onNodeKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    node: MapNodePosition
  ): void {
    if (!node.isExit || !node.linkedMapId) return
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    onOpenMap(node.linkedMapId)
  }

  return (
    <div
      ref={graphRef}
      className={`map-graph${showCanvas ? ' map-graph--canvas' : ''}`}
      style={{ width: layout.width, height: layout.height }}
      role="group"
      aria-label={fill(m.maps.graph.ariaLabel, { name: mapName })}
    >
      <svg
        className="map-graph__edges"
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        aria-hidden="true"
      >
        {edges.map((edge) => {
          const d = edgePath(edge.from, edge.to)

          return (
            <g key={edge.key}>
              <path className="map-edge map-edge--bed" d={d} />
              <path className="map-edge map-edge--trail" d={d} />
              {interactive && onDisconnect ? (
                <path
                  className="map-edge map-edge--hit"
                  d={d}
                  vectorEffect="non-scaling-stroke"
                  onDoubleClick={() => onDisconnect(edge.from.id, edge.to.id)}
                >
                  <title>{m.maps.graph.removePathHint}</title>
                </path>
              ) : null}
            </g>
          )
        })}

        {connectionSource && connection ? (
          <path
            className="map-edge map-edge--preview"
            d={previewPath(connectionSource, { x: connection.x, y: connection.y })}
          />
        ) : null}
      </svg>

      {layout.nodes.map((node) => {
        const linkedName = node.linkedMapId ? linkedMapNames[node.linkedMapId] : undefined
        const placeType = node.placeTypeId
          ? placeTypeById.get(node.placeTypeId)
          : undefined
        const placeMonsters = monsterNamesByPlace?.[node.id] ?? []
        const hasDescription = descriptionPlaceIds?.has(node.id) ?? false
        const className = [
          'map-node',
          'map-node--token',
          node.isExit ? 'map-node--exit' : '',
          linkedName ? 'map-node--linked' : '',
          draggingId === node.id ? 'map-node--dragging' : '',
          connection?.fromId === node.id ? 'map-node--drawing' : '',
          connection?.targetId === node.id ? 'map-node--target' : '',
          !interactive ? 'map-node--static' : ''
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <div
            key={node.id}
            className={className}
            style={{ left: node.x, top: node.y }}
            data-map-node-id={node.id}
            role={linkedName ? 'button' : undefined}
            tabIndex={linkedName ? 0 : undefined}
            aria-label={
              linkedName
                ? fill(m.maps.graph.linkedNodeLabel, { name: node.name, linked: linkedName })
                : undefined
            }
            title={
              interactive
                ? linkedName
                  ? fill(m.maps.graph.moveAndOpenHint, { name: linkedName })
                  : m.maps.graph.moveHint
                : linkedName
                  ? fill(m.maps.graph.openMapHint, { name: linkedName })
                  : node.name
            }
            onClick={
              !interactive && linkedName ? () => onLinkedClick(node) : undefined
            }
            onPointerDown={
              interactive
                ? (event) => onPointerDown(event, node)
                : linkedName
                  ? (event) => event.stopPropagation()
                  : undefined
            }
            onPointerMove={interactive ? onPointerMove : undefined}
            onPointerUp={
              interactive
                ? (event) => finishDrag(event, node)
                : linkedName
                  ? (event) => {
                      event.stopPropagation()
                      openLinkedMap(node)
                    }
                  : undefined
            }
            onPointerCancel={interactive ? cancelDrag : undefined}
            onKeyDown={linkedName ? (event) => onNodeKeyDown(event, node) : undefined}
          >
            <span className="map-node__token">
              {placeType ? (
                <PlaceTypeIcon svg={placeType.iconSvg} size={36} />
              ) : (
                <span className="map-node__token-initial">{nodeInitial(node.name)}</span>
              )}
              {node.isExit ? <MapExitFrame className="map-node__exit-frame" /> : null}
            </span>

            {hasDescription && onOpenPlaceDescription ? (
              <button
                type="button"
                className="map-node__description"
                title={m.maps.graph.descriptionTooltip}
                aria-label={fill(m.maps.graph.descriptionLabel, { name: node.name })}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation()
                  onOpenPlaceDescription(node.id)
                }}
              >
                <IconNote width={13} height={13} />
              </button>
            ) : null}

            {placeMonsters.length > 0 && onOpenPlaceMonsters ? (
              <button
                type="button"
                className="map-node__monsters"
                title={fill(m.maps.graph.monstersTooltip, { names: placeMonsters.join(', ') })}
                aria-label={fill(m.maps.graph.monstersLabel, { name: node.name })}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation()
                  onOpenPlaceMonsters(node.id)
                }}
              >
                <IconMonsterFace width={13} height={13} />
              </button>
            ) : null}

            <span className="map-node__token-label">{node.name}</span>

            {interactive ? (
              <span
                className="map-node__connector"
                title={m.maps.graph.connectHint}
                aria-hidden="true"
                onPointerDown={(event) => startConnection(event, node)}
                onPointerMove={moveConnection}
                onPointerUp={finishConnection}
                onPointerCancel={cancelConnection}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
