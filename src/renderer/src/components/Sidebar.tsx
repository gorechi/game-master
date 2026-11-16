import type { JSX } from 'react'
import { isWebPreview } from '@renderer/lib/api'
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
        <span className="sidebar__title">Game Master</span>

        <button
          type="button"
          className="sidebar__collapse"
          title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
          aria-label={collapsed ? 'Развернуть боковое меню' : 'Свернуть боковое меню'}
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

      <nav className="sidebar__nav" aria-label="Основная навигация">
        <button
          type="button"
          className={`nav-item${active === 'games' ? ' nav-item--active' : ''}`}
          aria-current={active === 'games' ? 'page' : undefined}
          title={collapsed ? 'Игры' : undefined}
          onClick={() => onNavigate({ name: 'games' })}
        >
          <IconPlay />
          <span>Игры</span>
        </button>

        <button
          type="button"
          className={`nav-item${active === 'players' ? ' nav-item--active' : ''}`}
          aria-current={active === 'players' ? 'page' : undefined}
          title={collapsed ? 'Игроки' : undefined}
          onClick={() => onNavigate({ name: 'players' })}
        >
          <IconUsers />
          <span>Игроки</span>
        </button>

        <button
          type="button"
          className={`nav-item${active === 'characters' ? ' nav-item--active' : ''}`}
          aria-current={active === 'characters' ? 'page' : undefined}
          title={collapsed ? 'Персонажи' : undefined}
          onClick={() => onNavigate({ name: 'characters' })}
        >
          <IconShield />
          <span>Персонажи</span>
        </button>

        <button
          type="button"
          className={`nav-item${active === 'monsters' ? ' nav-item--active' : ''}`}
          aria-current={active === 'monsters' ? 'page' : undefined}
          title={collapsed ? 'Бестиарий' : undefined}
          onClick={() => onNavigate({ name: 'monsters' })}
        >
          <IconSkull />
          <span>Бестиарий</span>
        </button>

        <button
          type="button"
          className={`nav-item${active === 'savedMonsters' ? ' nav-item--active' : ''}`}
          aria-current={active === 'savedMonsters' ? 'page' : undefined}
          title={collapsed ? 'Уникальные существа' : undefined}
          onClick={() => onNavigate({ name: 'savedMonsters' })}
        >
          <IconBookmark />
          <span>Уникальные существа</span>
        </button>

        <button
          type="button"
          className={`nav-item${active === 'maps' ? ' nav-item--active' : ''}`}
          aria-current={active === 'maps' ? 'page' : undefined}
          title={collapsed ? 'Карты' : undefined}
          onClick={() => onNavigate({ name: 'maps' })}
        >
          <IconMap />
          <span>Карты</span>
        </button>

        <button
          type="button"
          className={`nav-item${active === 'realms' ? ' nav-item--active' : ''}`}
          aria-current={active === 'realms' ? 'page' : undefined}
          title={collapsed ? 'Сеттинги' : undefined}
          onClick={() => onNavigate({ name: 'realms' })}
        >
          <IconGlobe />
          <span>Сеттинги</span>
        </button>
      </nav>

      <div className="sidebar__bottom">
        <div className="sidebar__bottom-row">
          <button
            type="button"
            className={`nav-item${active === 'data' ? ' nav-item--active' : ''}`}
            aria-current={active === 'data' ? 'page' : undefined}
            title={collapsed ? 'Данные' : undefined}
            onClick={() => onNavigate({ name: 'data' })}
          >
            <IconDatabase />
            <span>Данные</span>
          </button>

          <button
            type="button"
            className={`nav-item${active === 'settings' ? ' nav-item--active' : ''}`}
            aria-current={active === 'settings' ? 'page' : undefined}
            title={collapsed ? 'Настройки' : undefined}
            onClick={() => onNavigate({ name: 'settings' })}
          >
            <IconGear />
            <span>Настройки</span>
          </button>
        </div>

        {isWebPreview ? (
          <div className="sidebar__note">
            Веб-предпросмотр
            <span>данные в браузере</span>
          </div>
        ) : null}
      </div>
    </aside>
  )
}
