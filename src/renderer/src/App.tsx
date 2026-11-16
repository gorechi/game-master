import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { Realm } from '@shared/realm'
import { DEFAULT_SETTINGS, type AppSettings, type ThemeName } from '@shared/settings'
import type { UpdateState } from '@shared/update'
import { Sidebar } from './components/Sidebar'
import { GamesPage } from './components/GamesPage'
import { GameRunPage } from './components/GameRunPage'
import { PlayersPage } from './components/PlayersPage'
import { PlayerCharactersPage } from './components/PlayerCharactersPage'
import { CharactersPage } from './components/CharactersPage'
import { MonstersPage } from './components/MonstersPage'
import { SavedMonstersPage } from './components/SavedMonstersPage'
import { MapsPage } from './components/MapsPage'
import { MapGraphPage } from './components/MapGraphPage'
import { RealmsPage } from './components/RealmsPage'
import { RealmDetailPage } from './components/RealmDetailPage'
import { DataPage } from './components/DataPage'
import { SettingsPage } from './components/SettingsPage'
import { WindowTitleBar } from './components/WindowTitleBar'
import { UpdateNotice } from './components/UpdateNotice'
import { api, isWebPreview } from './lib/api'
import { applyTheme } from './lib/theme'
import type { Route } from './lib/routes'

const USER_AGENT = typeof navigator === 'undefined' ? '' : navigator.userAgent
const IS_MAC = /Mac/.test(USER_AGENT)
const IS_WINDOWS = /Windows/.test(USER_AGENT)
const IS_LINUX = /Linux/.test(USER_AGENT) && !/Android/.test(USER_AGENT)
// На Linux остаётся системная рамка, поэтому своя полоса не нужна.
const SHOW_WINDOW_TITLEBAR = !isWebPreview && !IS_LINUX

const SIDEBAR_COLLAPSED_KEY = 'game-master.sidebar.collapsed'

function readSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export default function App(): JSX.Element {
  const [route, setRoute] = useState<Route>({ name: 'games' })
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [realms, setRealms] = useState<Realm[]>([])
  const [updateState, setUpdateState] = useState<UpdateState | null>(null)
  const [checkingUpdates, setCheckingUpdates] = useState(false)
  const [dismissedUpdateVersion, setDismissedUpdateVersion] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed)

  useEffect(() => {
    let cancelled = false

    void Promise.all([api.settings.get(), api.realms.list()])
      .then(([loaded, loadedRealms]) => {
        if (cancelled) return

        setSettings(loaded)
        setRealms(loadedRealms)
        applyTheme(loaded.theme)
      })
      .catch(() => {
        // Настройки недоступны — остаёмся на теме из кэша.
      })

    return () => {
      cancelled = true
    }
  }, [])

  const changeTheme = useCallback((theme: ThemeName): void => {
    // Сначала визуально, потом сохраняем: переключение не должно ждать диск.
    applyTheme(theme)
    setSettings((previous) => ({ ...previous, theme }))
    void api.settings.update({ theme }).catch(() => undefined)
  }, [])

  const checkUpdates = useCallback(async (): Promise<void> => {
    setCheckingUpdates(true)

    try {
      setUpdateState(await api.updates.check())
    } catch {
      // Сбой самого канала: оставляем прежнее состояние, в настройках можно повторить.
    } finally {
      setCheckingUpdates(false)
    }
  }, [])

  // Проверка версии при запуске приложения. Установку пользователь делает сам.
  useEffect(() => {
    void checkUpdates()
  }, [checkUpdates])

  const toggleSidebar = useCallback((): void => {
    setSidebarCollapsed((current) => !current)
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0')
    } catch {
      // Приватный режим или запрет хранилища: состояние просто не запомнится.
    }
  }, [sidebarCollapsed])

  const refreshRealms = useCallback(async (): Promise<void> => {
    try {
      setRealms(await api.realms.list())
    } catch {
      // Страница сеттингов покажет ошибку сама.
    }
  }, [])

  const refreshAppData = useCallback(async (): Promise<void> => {
    const [loadedSettings, loadedRealms] = await Promise.all([
      api.settings.get(),
      api.realms.list()
    ])
    setSettings(loadedSettings)
    setRealms(loadedRealms)
    applyTheme(loadedSettings.theme)
  }, [])

  return (
    <div
      className={`app-shell${IS_WINDOWS ? ' app-shell--win' : ''}${
        IS_MAC ? ' app-shell--mac' : ''
      }`}
    >
      {SHOW_WINDOW_TITLEBAR ? <WindowTitleBar /> : null}

      {updateState?.status === 'available' &&
      updateState.latestVersion !== dismissedUpdateVersion ? (
        <UpdateNotice
          update={updateState}
          onDismiss={() => setDismissedUpdateVersion(updateState.latestVersion)}
        />
      ) : null}

      <div
        className={`app${route.name === 'game' ? ' app--full' : ''}${
          route.name !== 'game' && sidebarCollapsed ? ' app--sidebar-collapsed' : ''
        }`}
      >
        {route.name !== 'game' ? (
          <Sidebar
            route={route}
            collapsed={sidebarCollapsed}
            onToggle={toggleSidebar}
            onNavigate={setRoute}
          />
        ) : null}

      <div className="app__content">
        {route.name === 'games' ? (
          <GamesPage
            realms={realms}
            onOpenGame={(id) => setRoute({ name: 'game', id })}
          />
        ) : null}

        {route.name === 'game' ? (
          <GameRunPage gameId={route.id} onBack={() => setRoute({ name: 'games' })} />
        ) : null}

        {route.name === 'players' ? (
          <PlayersPage
            onOpenPlayer={(id) => setRoute({ name: 'player', id, from: 'players' })}
          />
        ) : null}

        {route.name === 'player' ? (
          <PlayerCharactersPage
            playerId={route.id}
            realms={realms}
            backLabel={route.from === 'characters' ? 'Персонажи' : 'Игроки'}
            onBack={() =>
              setRoute(
                route.from === 'characters' ? { name: 'characters' } : { name: 'players' }
              )
            }
          />
        ) : null}

        {route.name === 'characters' ? (
          <CharactersPage
            realms={realms}
            onOpenPlayers={() => setRoute({ name: 'players' })}
            onOpenPlayer={(id) => setRoute({ name: 'player', id, from: 'characters' })}
          />
        ) : null}

        {route.name === 'monsters' ? <MonstersPage realms={realms} /> : null}

        {route.name === 'savedMonsters' ? <SavedMonstersPage realms={realms} /> : null}

        {route.name === 'maps' ? (
          <MapsPage
            realms={realms}
            onOpenMap={(id) => setRoute({ name: 'map', id })}
          />
        ) : null}

        {route.name === 'map' ? (
          <MapGraphPage
            mapId={route.id}
            realms={realms}
            onBack={() => setRoute({ name: 'maps' })}
            onOpenMap={(id) => setRoute({ name: 'map', id })}
          />
        ) : null}

        {route.name === 'realms' ? (
          <RealmsPage
            realms={realms}
            onOpenRealm={(id) => setRoute({ name: 'realm', id })}
            onChanged={() => void refreshRealms()}
          />
        ) : null}

        {route.name === 'realm' ? (
          <RealmDetailPage
            realm={realms.find((realm) => realm.id === route.id) ?? null}
            onBack={() => setRoute({ name: 'realms' })}
            onChanged={() => void refreshRealms()}
          />
        ) : null}

        {route.name === 'data' ? (
          <DataPage
            realms={realms}
            onRealmsChanged={refreshRealms}
            onAppDataRestored={refreshAppData}
          />
        ) : null}

        {route.name === 'settings' ? (
          <SettingsPage
            settings={settings}
            update={updateState}
            checkingUpdates={checkingUpdates}
            onThemeChange={changeTheme}
            onCheckUpdates={() => void checkUpdates()}
          />
        ) : null}
      </div>
      </div>
    </div>
  )
}
