import type { GameMap } from '@shared/map'

export const MAP_NODE_WIDTH = 96
export const MAP_NODE_HEIGHT = 96
export const MAP_GRAPH_PADDING = 70

export interface MapNodePosition {
  id: string
  name: string
  isExit: boolean
  linkedMapId: string | null
  x: number
  y: number
}

export interface MapLayout {
  width: number
  height: number
  nodes: MapNodePosition[]
}

export interface MapPoint {
  x: number
  y: number
}

interface AutoLayout {
  width: number
  height: number
  nodes: MapNodePosition[]
}

function autoLayout(map: GameMap): AutoLayout {
  const count = map.places.length

  if (count === 0) {
    return { width: 0, height: 0, nodes: [] }
  }

  if (count === 1) {
    return {
      width: 640,
      height: 360,
      nodes: [{ ...map.places[0]!, x: 320, y: 180 }]
    }
  }

  if (count === 2) {
    const width = 860
    const height = 360

    return {
      width,
      height,
      nodes: [
        { ...map.places[0]!, x: 220, y: height / 2 },
        { ...map.places[1]!, x: width - 220, y: height / 2 }
      ]
    }
  }

  const radius = Math.max(200, count * 38)
  const width = Math.round(2 * (radius + MAP_NODE_WIDTH / 2 + MAP_GRAPH_PADDING))
  const height = Math.round(2 * (radius + MAP_NODE_HEIGHT / 2 + MAP_GRAPH_PADDING))
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

/**
 * Раскладка карты. Если у места есть сохранённые координаты или переданные
 * вручную позиции, они имеют приоритет; иначе используется авто-раскладка.
 */
export function layoutMap(
  map: GameMap,
  overrides?: Record<string, MapPoint>
): MapLayout {
  const base = autoLayout(map)

  if (map.places.length === 0) {
    return { width: 0, height: 0, nodes: [] }
  }

  const nodes = map.places.map((place, index) => {
    const auto = base.nodes[index]!
    const saved =
      place.x !== null && place.y !== null ? { x: place.x, y: place.y } : null
    const position = overrides?.[place.id] ?? saved ?? { x: auto.x, y: auto.y }

    return {
      ...place,
      x: position.x,
      y: position.y
    }
  })

  const maxX = Math.max(...nodes.map((node) => node.x))
  const maxY = Math.max(...nodes.map((node) => node.y))
  const width = Math.max(
    base.width,
    Math.ceil(maxX + MAP_NODE_WIDTH / 2 + MAP_GRAPH_PADDING)
  )
  const height = Math.max(
    base.height,
    Math.ceil(maxY + MAP_NODE_HEIGHT / 2 + MAP_GRAPH_PADDING)
  )

  return { width, height, nodes }
}
