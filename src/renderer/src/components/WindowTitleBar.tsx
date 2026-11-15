import type { JSX } from 'react'
import { IconD20 } from './ui/icons'

/**
 * Собственная полоса заголовка для Electron. Нативная рамка скрыта, поэтому
 * полоса рисуется в цветах темы, а системные кнопки окна остаются нативными
 * (titleBarOverlay на Windows, traffic lights на macOS).
 */
export function WindowTitleBar(): JSX.Element {
  return (
    <header className="window-titlebar" aria-hidden="true">
      <span className="window-titlebar__mark">
        <IconD20 width={16} height={16} />
      </span>
      <span className="window-titlebar__title">Game Master</span>
    </header>
  )
}
