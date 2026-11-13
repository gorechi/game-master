import type { JSX } from 'react'
import type { GameMap, MapPath } from '@shared/map'
import { mapPathKey } from '@shared/domain'

const NODE_WIDTH = 190
const NODE_HEIGHT = 64
const GRAPH_PADDING = 70

interface GraphNode {
  id: string
  name: string
  isExit: boolean
  linkedMapId: string | null
  x: number
  y: number
}

interface GraphLayout {
  width: number
  height: number
  nodes: GraphNode[]
}

function layoutMap(map: GameMap): GraphLayout {
  const count = map.places.length

  if (count === 0) {
    return { width: 0, height: 0, nodes: [] }
  }

  if (count === 1) {
    return {
      width: 440,
      height: 280,
      nodes: [{ ...map.places[0]!, x: 220, y: 140 }]
    }
  }

  if (count === 2) {
    const width = 760
    const height = 320

    return {
      width,
      height,
      nodes: [
        { ...map.places[0]!, x: 180, y: height / 2 },
        { ...map.places[1]!, x: width - 180, y: height / 2 }
      ]
    }
  }

  const radius = Math.max(200, count * 38)
  const width = Math.round(2 * (radius + NODE_WIDTH / 2 + GRAPH_PADDING))
  const height = Math.round(2 * (radius + NODE_HEIGHT / 2 + GRAPH_PADDING))
  const centerX = width / 2
  const centerY = height / 2

  return {
    width,
    height,
    nodes: map.places.map((place, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / count

      return {
        ...place,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      }
    })
  }
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
function anchorPoint(from: GraphNode, to: GraphNode): { x: number; y: number } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const halfWidth = NODE_WIDTH / 2 + 4
  const halfHeight = NODE_HEIGHT / 2 + 4

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

function edgePath(from: GraphNode, to: GraphNode): string {
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

interface MapGraphProps {
  map: GameMap
  /** Названия других карт по id — для подписи выхода. */
  linkedMapNames: Record<string, string>
  onOpenMap: (mapId: string) => void
}

/** Графическое представление карты: места-прямоугольники и пути-дорожки. */
export function MapGraph({ map, linkedMapNames, onOpenMap }: MapGraphProps): JSX.Element {
  const layout = layoutMap(map)
  const nodesById = new Map(layout.nodes.map((node) => [node.id, node]))

  const edges: { key: string; from: GraphNode; to: GraphNode }[] = []

  for (const path of map.paths) {
    const from = nodesById.get(path.a)
    const to = nodesById.get(path.b)

    if (!from || !to) continue

    edges.push({ key: mapPathKey(path), from, to })
  }

  if (map.places.length === 0) {
    return (
      <div className="map-graph-empty">
        <p>На карте пока нет мест.</p>
        <span>Добавьте их в редакторе — и на карте появятся первые точки.</span>
      </div>
    )
  }

  function renderNodeContent(node: GraphNode): JSX.Element {
    const linkedName = node.linkedMapId ? linkedMapNames[node.linkedMapId] : undefined

    return (
      <>
        <span className="map-node__name">{node.name}</span>
        {node.isExit ? <span className="map-node__exit">Выход</span> : null}
        {linkedName ? <span className="map-node__link">→ {linkedName}</span> : null}
      </>
    )
  }

  return (
    <div
      className="map-graph"
      style={{ width: layout.width, height: layout.height }}
      role="group"
      aria-label={`Карта «${map.name}»`}
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
      </svg>

      {layout.nodes.map((node) => {
        const linkedName = node.linkedMapId ? linkedMapNames[node.linkedMapId] : undefined
        const className = [
          'map-node',
          node.isExit ? 'map-node--exit' : '',
          linkedName ? 'map-node--linked' : ''
        ]
          .filter(Boolean)
          .join(' ')

        if (linkedName) {
          return (
            <button
              key={node.id}
              type="button"
              className={className}
              style={{ left: node.x, top: node.y }}
              title={`Перейти на карту «${linkedName}»`}
              aria-label={`${node.name}: перейти на карту «${linkedName}»`}
              onClick={() => onOpenMap(node.linkedMapId!)}
            >
              {renderNodeContent(node)}
            </button>
          )
        }

        return (
          <div
            key={node.id}
            className={className}
            style={{ left: node.x, top: node.y }}
            title={node.name}
          >
            {renderNodeContent(node)}
          </div>
        )
      })}
    </div>
  )
}
