import type { JSX } from 'react'
import type { Realm } from '@shared/realm'
import { isWebPreview } from '@renderer/lib/api'
import type { Route } from '@renderer/lib/routes'
import { Select } from './ui/Select'
import {
  IconBookmark,
  IconD20,
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
  realms: readonly Realm[]
  activeRealmId: string | null
  onRealmChange: (realmId: string) => void
}

export function Sidebar({
  route,
  onNavigate,
  realms,
  activeRealmId,
  onRealmChange
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
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__die" aria-hidden="true">
          <IconD20 width={22} height={22} />
        </span>
        <span className="sidebar__title">Game Master</span>
      </div>

      {realms.length > 0 ? (
        <div className="realm-switcher">
          <span className="realm-switcher__label">Сеттинг</span>
          <Select
            ariaLabel="Активный сеттинг"
            value={activeRealmId ?? ''}
            placeholder="Выберите сеттинг"
            options={realms.map((realm) => ({ value: realm.id, label: realm.name }))}
            onChange={onRealmChange}
          />
        </div>
      ) : null}

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
          <span>Монстры</span>
        </button>

        <button
          type="button"
          className={`nav-item${active === 'savedMonsters' ? ' nav-item--active' : ''}`}
          aria-current={active === 'savedMonsters' ? 'page' : undefined}
          onClick={() => onNavigate({ name: 'savedMonsters' })}
        >
          <IconBookmark />
          <span>Игровые монстры</span>
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
