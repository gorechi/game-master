import type { JSX } from 'react'
import { useMessages } from '@renderer/i18n/LocaleProvider'
import { IconD20 } from './ui/icons'

/**
 * Собственная полоса заголовка для Electron. Нативная рамка скрыта, поэтому
 * полоса рисуется в цветах темы, а системные кнопки окна остаются нативными
 * (titleBarOverlay на Windows, traffic lights на macOS).
 */
export function WindowTitleBar(): JSX.Element {
  const m = useMessages()

  return (
    <header className="window-titlebar" aria-hidden="true">
      <span className="window-titlebar__mark">
        <IconD20 width={16} height={16} />
      </span>
      <span className="window-titlebar__title">{m.app.name}</span>
    </header>
  )
}
