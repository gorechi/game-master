import type { JSX } from 'react'
import { isWebPreview } from '@renderer/lib/api'
import type { Route } from '@renderer/lib/routes'
import {
  IconBookmark,
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
  onNavigate: (route: Route) => void
}

export function Sidebar({ route, onNavigate }: SidebarProps): JSX.Element {
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
          className={`nav-item${active === 'games' ? ' nav-item--active' : ''}`}
          aria-current={active === 'games' ? 'page' : undefined}
          onClick={() => onNavigate({ name: 'games' })}
        >
          <IconPlay />
          <span>Игры</span>
        </button>

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
          className={`nav-item${active === 'monsters' ? ' nav-item--active' : ''}`}
          aria-current={active === 'monsters' ? 'page' : undefined}
          onClick={() => onNavigate({ name: 'monsters' })}
        >
          <IconSkull />
          <span>Бестиарий</span>
        </button>

        <button
          type="button"
          className={`nav-item${active === 'savedMonsters' ? ' nav-item--active' : ''}`}
          aria-current={active === 'savedMonsters' ? 'page' : undefined}
          onClick={() => onNavigate({ name: 'savedMonsters' })}
        >
          <IconBookmark />
          <span>Уникальные существа</span>
        </button>

        <button
          type="button"
          className={`nav-item${active === 'maps' ? ' nav-item--active' : ''}`}
          aria-current={active === 'maps' ? 'page' : undefined}
          onClick={() => onNavigate({ name: 'maps' })}
        >
          <IconMap />
          <span>Карты</span>
        </button>

        <button
          type="button"
          className={`nav-item${active === 'realms' ? ' nav-item--active' : ''}`}
          aria-current={active === 'realms' ? 'page' : undefined}
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
            onClick={() => onNavigate({ name: 'data' })}
          >
            <IconDatabase />
            <span>Данные</span>
          </button>

          <button
            type="button"
            className={`nav-icon-button${
              active === 'settings' ? ' nav-icon-button--active' : ''
            }`}
            aria-label="Настройки"
            aria-current={active === 'settings' ? 'page' : undefined}
            title="Настройки"
            onClick={() => onNavigate({ name: 'settings' })}
          >
            <IconGear />
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
