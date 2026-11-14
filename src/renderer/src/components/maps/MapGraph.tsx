import { useRef, useState } from 'react'
import type { JSX, KeyboardEvent, PointerEvent } from 'react'
import type { MapPath } from '@shared/map'
import { mapPathKey } from '@shared/domain'
import {
  MAP_GRAPH_PADDING,
  MAP_NODE_HEIGHT,
  MAP_NODE_WIDTH,
  type MapLayout,
  type MapNodePosition
} from '@renderer/lib/mapLayout'
import { IconStoneArch } from '../ui/icons'

const DRAG_THRESHOLD = 4

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

/** Точка на границе прямоугольника места в сторону соседа. */
function anchorPoint(from: MapNodePosition, to: MapNodePosition): { x: number; y: number } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const halfWidth = MAP_NODE_WIDTH / 2 + 4
  const halfHeight = MAP_NODE_HEIGHT / 2 + 4

  const scale = Math.min(
    Math.abs(dx) < 0.001 ? Number.POSITIVE_INFINITY : halfWidth / Math.abs(dx),
    Math.abs(dy) < 0.001 ? Number.POSITIVE_INFINITY : halfHeight / Math.abs(dy)
  )

  if (!Number.isFinite(scale)) {
    return { x: from.x, y: from.y }
  }

  return {
    x: from.x + dx * scale,
    y: from.y + dy * scale
  }
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
  const dx = point.x - from.x
  const dy = point.y - from.y
  const halfWidth = MAP_NODE_WIDTH / 2 + 4
  const halfHeight = MAP_NODE_HEIGHT / 2 + 4
  const scale = Math.min(
    Math.abs(dx) < 0.001 ? Number.POSITIVE_INFINITY : halfWidth / Math.abs(dx),
    Math.abs(dy) < 0.001 ? Number.POSITIVE_INFINITY : halfHeight / Math.abs(dy)
  )
  const startX = Number.isFinite(scale) ? from.x + dx * scale : from.x
  const startY = Number.isFinite(scale) ? from.y + dy * scale : from.y

  return `M ${startX} ${startY} Q ${(startX + point.x) / 2} ${(startY + point.y) / 2} ${point.x} ${point.y}`
}

interface MapGraphProps {
  mapName: string
  paths: readonly MapPath[]
  layout: MapLayout
  /** Названия других карт по id — для подписи выхода. */
  linkedMapNames: Record<string, string>
  onOpenMap: (mapId: string) => void
  onMoveNode: (placeId: string, x: number, y: number) => void
  onConnect: (fromId: string, toId: string) => void
}

/** Графическое представление карты: места-прямоугольники и пути-дорожки. */
export function MapGraph({
  mapName,
  paths,
  layout,
  linkedMapNames,
  onOpenMap,
  onMoveNode,
  onConnect
}: MapGraphProps): JSX.Element {
  const dragRef = useRef<DragState | null>(null)
  const connectionRef = useRef<ConnectionDraft | null>(null)
  const graphRef = useRef<HTMLDivElement>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [connection, setConnection] = useState<ConnectionDraft | null>(null)

  if (layout.nodes.length === 0) {
    return (
      <div className="map-graph-empty">
        <p>На карте пока нет мест.</p>
        <span>Добавьте их в редакторе — и на карте появятся первые точки.</span>
      </div>
    )
  }

  const nodesById = new Map(layout.nodes.map((node) => [node.id, node]))
  const edges: { key: string; from: MapNodePosition; to: MapNodePosition }[] = []

  for (const path of paths) {
    const from = nodesById.get(path.a)
    const to = nodesById.get(path.b)

    if (!from || !to) continue

    edges.push({ key: mapPathKey(path), from, to })
  }

  const minX = MAP_NODE_WIDTH / 2 + MAP_GRAPH_PADDING
  const maxX = Math.max(minX, layout.width - minX)
  const minY = MAP_NODE_HEIGHT / 2 + MAP_GRAPH_PADDING
  const maxY = Math.max(minY, layout.height - minY)

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

    const dx = event.clientX - drag.startClientX
    const dy = event.clientY - drag.startClientY

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

    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
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
      className="map-graph"
      style={{ width: layout.width, height: layout.height }}
      role="group"
      aria-label={`Карта «${mapName}»`}
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
        const className = [
          'map-node',
          node.isExit ? 'map-node--exit' : '',
          linkedName ? 'map-node--linked' : '',
          draggingId === node.id ? 'map-node--dragging' : '',
          connection?.fromId === node.id ? 'map-node--drawing' : '',
          connection?.targetId === node.id ? 'map-node--target' : ''
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
                ? `${node.name}: перейти на карту «${linkedName}»`
                : undefined
            }
            title={
              linkedName
                ? `Перетащите, чтобы сдвинуть. Нажмите, чтобы перейти на «${linkedName}»`
                : 'Перетащите, чтобы сдвинуть'
            }
            onPointerDown={(event) => onPointerDown(event, node)}
            onPointerMove={onPointerMove}
            onPointerUp={(event) => finishDrag(event, node)}
            onPointerCancel={cancelDrag}
            onKeyDown={(event) => onNodeKeyDown(event, node)}
          >
            <span className="map-node__name">{node.name}</span>
            {node.isExit ? (
              <span className="map-exit-mark" title="Выход на другую карту">
                <IconStoneArch width={13} height={13} />
              </span>
            ) : null}
            {linkedName ? <span className="map-node__link">→ {linkedName}</span> : null}

            <span
              className="map-node__connector"
              title="Потяните, чтобы провести путь"
              aria-hidden="true"
              onPointerDown={(event) => startConnection(event, node)}
              onPointerMove={moveConnection}
              onPointerUp={finishConnection}
              onPointerCancel={cancelConnection}
            />
          </div>
        )
      })}
    </div>
  )
}
