import type { JSX } from 'react'
import { isWebPreview } from '@renderer/lib/api'
import type { Route } from '@renderer/lib/routes'
import { IconD20, IconGear, IconShield, IconUsers } from './ui/icons'

interface SidebarProps {
  route: Route
  onNavigate: (route: Route) => void
}

export function Sidebar({ route, onNavigate }: SidebarProps): JSX.Element {
  const active = route.name === 'player' ? 'players' : route.name

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__die" aria-hidden="true">
          <IconD20 width={22} height={22} />
        </span>
        <span className="sidebar__title">Game Master</span>
      </div>

      <nav className="sidebar__nav" aria-label="Основная навигация">
        <button
          type="button"
          className={`nav-item${active === 'players' ? ' nav-item--active' : ''}`}
          aria-current={active === 'players' ? 'page' : undefined}
          onClick={() => onNavigate({ name: 'players' })}
        >
          <IconUsers />
          <span>Игроки</span>
        </button>

        <button
          type="button"
          className={`nav-item${active === 'characters' ? ' nav-item--active' : ''}`}
          aria-current={active === 'characters' ? 'page' : undefined}
          onClick={() => onNavigate({ name: 'characters' })}
        >
          <IconShield />
          <span>Персонажи</span>
        </button>

        <button
          type="button"
          className={`nav-item${active === 'settings' ? ' nav-item--active' : ''}`}
          aria-current={active === 'settings' ? 'page' : undefined}
          onClick={() => onNavigate({ name: 'settings' })}
        >
          <IconGear />
          <span>Настройки</span>
        </button>
      </nav>

      {isWebPreview ? (
        <div className="sidebar__note">
          Веб-предпросмотр
          <span>данные в браузере</span>
        </div>
      ) : null}
    </aside>
  )
}
