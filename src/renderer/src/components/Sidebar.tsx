import type { JSX } from 'react'
import { isWebPreview } from '@renderer/lib/api'
import { useMessages } from '@renderer/i18n/LocaleProvider'
import type { Route } from '@renderer/lib/routes'
import {
  IconBookmark,
  IconChevronLeft,
  IconChevronRight,
  IconD20,
  IconDatabase,
  IconGear,
  IconGlobe,
  IconMap,
  IconPlay,
  IconShield,
  IconSkull,
  IconUsers
} from './ui/icons'

interface SidebarProps {
  route: Route
  collapsed: boolean
  onToggle: () => void
  onNavigate: (route: Route) => void
}

export function Sidebar({
  route,
  collapsed,
  onToggle,
  onNavigate
}: SidebarProps): JSX.Element {
  const m = useMessages()

  const active =
    route.name === 'game'
      ? 'games'
      : route.name === 'map'
        ? 'maps'
        : route.name === 'player'
          ? 'players'
          : route.name === 'realm'
            ? 'realms'
            : route.name

  return (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      <div className="sidebar__brand">
        <span className="sidebar__die" aria-hidden="true">
          <IconD20 width={22} height={22} />
        </span>
        <span className="sidebar__title">{m.app.name}</span>

        <button
          type="button"
          className="sidebar__collapse"
          title={collapsed ? m.sidebar.expandMenu : m.sidebar.collapseMenu}
          aria-label={collapsed ? m.sidebar.expandMenuLabel : m.sidebar.collapseMenuLabel}
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          {collapsed ? (
            <IconChevronRight width={16} height={16} />
          ) : (
            <IconChevronLeft width={16} height={16} />
          )}
        </button>
      </div>

      <nav className="sidebar__nav" aria-label={m.sidebar.navigationLabel}>
        <button
          type="button"
          className={`nav-item${active === 'games' ? ' nav-item--active' : ''}`}
          aria-current={active === 'games' ? 'page' : undefined}
          title={collapsed ? m.sidebar.games : undefined}
          onClick={() => onNavigate({ name: 'games' })}
        >
          <IconPlay />
          <span>{m.sidebar.games}</span>
        </button>

        <button
          type="button"
          className={`nav-item${active === 'players' ? ' nav-item--active' : ''}`}
          aria-current={active === 'players' ? 'page' : undefined}
          title={collapsed ? m.sidebar.players : undefined}
          onClick={() => onNavigate({ name: 'players' })}
        >
          <IconUsers />
          <span>{m.sidebar.players}</span>
        </button>

        <button
          type="button"
          className={`nav-item${active === 'characters' ? ' nav-item--active' : ''}`}
          aria-current={active === 'characters' ? 'page' : undefined}
          title={collapsed ? m.sidebar.characters : undefined}
          onClick={() => onNavigate({ name: 'characters' })}
        >
          <IconShield />
          <span>{m.sidebar.characters}</span>
        </button>

        <button
          type="button"
          className={`nav-item${active === 'monsters' ? ' nav-item--active' : ''}`}
          aria-current={active === 'monsters' ? 'page' : undefined}
          title={collapsed ? m.sidebar.bestiary : undefined}
          onClick={() => onNavigate({ name: 'monsters' })}
        >
          <IconSkull />
          <span>{m.sidebar.bestiary}</span>
        </button>

        <button
          type="button"
          className={`nav-item${active === 'savedMonsters' ? ' nav-item--active' : ''}`}
          aria-current={active === 'savedMonsters' ? 'page' : undefined}
          title={collapsed ? m.sidebar.savedMonsters : undefined}
          onClick={() => onNavigate({ name: 'savedMonsters' })}
        >
          <IconBookmark />
          <span>{m.sidebar.savedMonsters}</span>
        </button>

        <button
          type="button"
          className={`nav-item${active === 'maps' ? ' nav-item--active' : ''}`}
          aria-current={active === 'maps' ? 'page' : undefined}
          title={collapsed ? m.sidebar.maps : undefined}
          onClick={() => onNavigate({ name: 'maps' })}
        >
          <IconMap />
          <span>{m.sidebar.maps}</span>
        </button>

        <button
          type="button"
          className={`nav-item${active === 'realms' ? ' nav-item--active' : ''}`}
          aria-current={active === 'realms' ? 'page' : undefined}
          title={collapsed ? m.sidebar.realms : undefined}
          onClick={() => onNavigate({ name: 'realms' })}
        >
          <IconGlobe />
          <span>{m.sidebar.realms}</span>
        </button>
      </nav>

      <div className="sidebar__bottom">
        <div className="sidebar__bottom-row">
          <button
            type="button"
            className={`nav-item${active === 'data' ? ' nav-item--active' : ''}`}
            aria-current={active === 'data' ? 'page' : undefined}
            title={collapsed ? m.sidebar.data : undefined}
            onClick={() => onNavigate({ name: 'data' })}
          >
            <IconDatabase />
            <span>{m.sidebar.data}</span>
          </button>

          <button
            type="button"
            className={`nav-item${active === 'settings' ? ' nav-item--active' : ''}`}
            aria-current={active === 'settings' ? 'page' : undefined}
            title={collapsed ? m.sidebar.settings : undefined}
            onClick={() => onNavigate({ name: 'settings' })}
          >
            <IconGear />
            <span>{m.sidebar.settings}</span>
          </button>
        </div>

        {isWebPreview ? (
          <div className="sidebar__note">
            {m.sidebar.webPreview}
            <span>{m.sidebar.webPreviewData}</span>
          </div>
        ) : null}
      </div>
    </aside>
  )
}
