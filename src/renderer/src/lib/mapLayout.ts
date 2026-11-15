import type { GameMap } from '@shared/map'

export const MAP_NODE_WIDTH = 96
export const MAP_NODE_HEIGHT = 96
export const MAP_GRAPH_PADDING = 70

export interface MapNodePosition {
  id: string
  name: string
  isExit: boolean
  linkedMapId: string | null
  placeTypeId: string | null
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

/** Размер рабочего поля редактора. */
const MAP_WORKSPACE_WIDTH = 4000
const MAP_WORKSPACE_HEIGHT = 3000

/**
 * Раскладка редактора. Координаты мест — это координаты самого поля.
 * Новые места без сохранённых координат автоматически ставятся в центр.
 */
export function editorLayout(
  map: GameMap,
  overrides: Record<string, MapPoint> | undefined
): MapLayout {
  if (map.places.length === 0) {
    return { width: MAP_WORKSPACE_WIDTH, height: MAP_WORKSPACE_HEIGHT, nodes: [] }
  }

  const autoMap: GameMap = {
    ...map,
    places: map.places.map((place) => ({ ...place, x: null, y: null }))
  }
  const auto = layoutMap(autoMap)
  const autoOffsetX = Math.max(
    0,
    Math.round((MAP_WORKSPACE_WIDTH - auto.width) / 2)
  )
  const autoOffsetY = Math.max(
    0,
    Math.round((MAP_WORKSPACE_HEIGHT - auto.height) / 2)
  )
  const autoById = new Map(auto.nodes.map((node) => [node.id, node]))

  return {
    width: MAP_WORKSPACE_WIDTH,
    height: MAP_WORKSPACE_HEIGHT,
    nodes: map.places.map((place) => {
      const override = overrides?.[place.id]
      const saved =
        place.x !== null && place.y !== null ? { x: place.x, y: place.y } : null
      const autoNode = autoById.get(place.id)
      const position =
        override ??
        saved ??
        (autoNode
          ? { x: autoNode.x + autoOffsetX, y: autoNode.y + autoOffsetY }
          : { x: MAP_WORKSPACE_WIDTH / 2, y: MAP_WORKSPACE_HEIGHT / 2 })

      return {
        ...place,
        x: position.x,
        y: position.y
      }
    })
  }
}

function autoLayout(map: GameMap): MapNodePosition[] {
  const count = map.places.length

  if (count === 0) return []

  if (count === 1) {
    return [{ ...map.places[0]!, x: 320, y: 180 }]
  }

  if (count === 2) {
    const height = 360

    return [
      { ...map.places[0]!, x: 220, y: height / 2 },
      { ...map.places[1]!, x: 640, y: height / 2 }
    ]
  }

  const radius = Math.max(200, count * 38)
  const width = Math.round(2 * (radius + MAP_NODE_WIDTH / 2 + MAP_GRAPH_PADDING))
  const height = Math.round(2 * (radius + MAP_NODE_HEIGHT / 2 + MAP_GRAPH_PADDING))
  const centerX = width / 2
  const centerY = height / 2

  return map.places.map((place, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count

    return {
      ...place,
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    }
  })
}

/**
 * Раскладка карты. Если у места есть сохранённые координаты или переданные
 * вручную позиции, они имеют приоритет; иначе используется авто-раскладка.
 */
export function layoutMap(
  map: GameMap,
  overrides?: Record<string, MapPoint>
): MapLayout {
  const auto = autoLayout(map)

  if (map.places.length === 0) {
    return { width: 0, height: 0, nodes: [] }
  }

  const nodes = map.places.map((place, index) => {
    const autoNode = auto[index]!
    const saved =
      place.x !== null && place.y !== null ? { x: place.x, y: place.y } : null
    const position =
      overrides?.[place.id] ?? saved ?? { x: autoNode.x, y: autoNode.y }

    return {
      ...place,
      x: position.x,
      y: position.y
    }
  })

  // Сдвигаем раскладку так, чтобы крайние жетоны не выходили за пределы поля.
  const minX = Math.min(...nodes.map((node) => node.x))
  const minY = Math.min(...nodes.map((node) => node.y))
  const maxX = Math.max(...nodes.map((node) => node.x))
  const maxY = Math.max(...nodes.map((node) => node.y))
  const shiftX = MAP_NODE_WIDTH / 2 + MAP_GRAPH_PADDING - minX
  const shiftY = MAP_NODE_HEIGHT / 2 + MAP_GRAPH_PADDING - minY
  const width = Math.ceil(maxX - minX + MAP_NODE_WIDTH + MAP_GRAPH_PADDING * 2)
  const height = Math.ceil(maxY - minY + MAP_NODE_HEIGHT + MAP_GRAPH_PADDING * 2)

  return {
    width,
    height,
    nodes: nodes.map((node) => ({
      ...node,
      x: node.x + shiftX,
      y: node.y + shiftY
    }))
  }
}
