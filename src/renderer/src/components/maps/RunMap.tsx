import { useEffect, useRef, useState } from 'react'
import type { JSX, PointerEvent } from 'react'
import type { GameMap } from '@shared/map'
import type { PlaceType } from '@shared/placeType'
import { layoutMap } from '@renderer/lib/mapLayout'
import { MapGraph } from './MapGraph'

interface RunMapProps {
  map: GameMap
  placeTypes: readonly PlaceType[]
  linkedMapNames: Record<string, string>
  onOpenMap: (mapId: string) => void
}

const VIEWPORT_PADDING = 36
const MIN_SCALE = 0.45
const MAX_SCALE = 2.2

interface PanState {
  pointerId: number
  startX: number
  startY: number
  scrollLeft: number
  scrollTop: number
}

/** Карта на экране проведения: только чтение, с автомасштабом и перетаскиванием. */
export function RunMap({
  map,
  placeTypes,
  linkedMapNames,
  onOpenMap
}: RunMapProps): JSX.Element {
  const viewportRef = useRef<HTMLDivElement>(null)
  const panRef = useRef<PanState | null>(null)
  const [scale, setScale] = useState(1)
  const [panning, setPanning] = useState(false)
  const layout = layoutMap(map)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || layout.width === 0 || layout.height === 0) return

    const updateScale = (): void => {
      const availableWidth = viewport.clientWidth - VIEWPORT_PADDING
      const availableHeight = viewport.clientHeight - VIEWPORT_PADDING
      const fit = Math.min(
        availableWidth / layout.width,
        availableHeight / layout.height
      )

      // Вписываем карту в экран, но не даём жетонам стать микроскопическими.
      setScale(Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.floor(fit * 100) / 100)))
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(viewport)

    return () => observer.disconnect()
  }, [layout.width, layout.height])

  function startPan(event: PointerEvent<HTMLDivElement>): void {
    if (event.button !== 0) return

    const target = event.target
    if (target instanceof Element && target.closest('.map-node--linked')) return

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

  function movePan(event: PointerEvent<HTMLDivElement>): void {
    const pan = panRef.current
    if (!pan || pan.pointerId !== event.pointerId) return

    event.preventDefault()
    event.currentTarget.scrollLeft = pan.scrollLeft - (event.clientX - pan.startX)
    event.currentTarget.scrollTop = pan.scrollTop - (event.clientY - pan.startY)
  }

  function endPan(event: PointerEvent<HTMLDivElement>): void {
    const pan = panRef.current
    if (!pan || pan.pointerId !== event.pointerId) return

    panRef.current = null
    setPanning(false)

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  if (layout.width === 0) {
    return (
      <div className="run-map-viewport">
        <MapGraph
          mapName={map.name}
          paths={map.paths}
          layout={layout}
          placeTypes={placeTypes}
          linkedMapNames={linkedMapNames}
          onOpenMap={onOpenMap}
          onMoveNode={() => undefined}
          onConnect={() => undefined}
          interactive={false}
        />
      </div>
    )
  }

  return (
    <div
      ref={viewportRef}
      className={`run-map-viewport${panning ? ' run-map-viewport--panning' : ''}`}
      onPointerDown={startPan}
      onPointerMove={movePan}
      onPointerUp={endPan}
      onPointerCancel={endPan}
    >
      <div
        className="run-map-fit"
        style={{ width: layout.width * scale, height: layout.height * scale }}
      >
        <div
          className="run-map-scale"
          style={{
            width: layout.width,
            height: layout.height,
            transform: `scale(${scale})`
          }}
        >
          <MapGraph
            mapName={map.name}
            paths={map.paths}
            layout={layout}
            placeTypes={placeTypes}
            linkedMapNames={linkedMapNames}
            onOpenMap={onOpenMap}
            onMoveNode={() => undefined}
            onConnect={() => undefined}
            interactive={false}
          />
        </div>
      </div>
    </div>
  )
}
