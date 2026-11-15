import type { JSX } from 'react'
import { validatePlaceIcon } from '@shared/placeIcon'

interface PlaceTypeIconProps {
  svg: string
  size?: number
  className?: string
}

/**
 * Безопасный вывод иконки места. SVG уже проверен при сохранении,
 * но перед вставкой проверяется ещё раз: в localStorage мог попасть
 * старый или повреждённый файл.
 */
export function PlaceTypeIcon({ svg, size = 24, className }: PlaceTypeIconProps): JSX.Element {
  const classes = `place-type-icon${className ? ` ${className}` : ''}`
  const style = { width: size, height: size }

  if (!validatePlaceIcon(svg).ok) {
    return (
      <span
        className={`${classes} place-type-icon--broken`}
        style={style}
        title="Иконка не прошла проверку"
        aria-hidden="true"
      >
        !
      </span>
    )
  }

  return (
    <span
      className={classes}
      style={style}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
