import type { JSX } from 'react'

type Props = {
  className?: string
  /** Толщина линий в единицах viewBox 100×100. */
  strokeWidth?: number
}

/**
 * Рамка вокруг жетона места-перехода.
 *
 * Сама иконка места остаётся любой: дверь, перекрёсток, портал и т. д.
 * Рамка только показывает, что через это место можно уйти на другую карту.
 */
export function MapExitFrame({ className, strokeWidth = 1.6 }: Props): JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="50"
        cy="50"
        r="48"
        pathLength={100}
        strokeDasharray="21 4"
        strokeWidth={strokeWidth}
      />
      <circle cx="50" cy="50" r="44" strokeWidth={strokeWidth} opacity="0.5" />
    </svg>
  )
}
