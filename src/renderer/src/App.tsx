import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { Realm } from '@shared/realm'
import { DEFAULT_SETTINGS, type AppSettings, type ThemeName } from '@shared/settings'
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
import { SettingsPage } from './components/SettingsPage'
import { api } from './lib/api'
import { applyTheme } from './lib/theme'
import type { Route } from './lib/routes'

export default function App(): JSX.Element {
  const [route, setRoute] = useState<Route>({ name: 'games' })
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [realms, setRealms] = useState<Realm[]>([])

  useEffect(() => {
    let cancelled = false

    void Promise.all([api.settings.get(), api.realms.list()])
      .then(([loaded, loadedRealms]) => {
        if (cancelled) return

        const active =
          loadedRealms.find((realm) => realm.id === loaded.activeRealmId) ??
          loadedRealms[0] ??
          null

        setSettings({ ...loaded, activeRealmId: active?.id ?? null })
        setRealms(loadedRealms)
        applyTheme(loaded.theme)

        if (active && active.id !== loaded.activeRealmId) {
          void api.realms.activate(active.id)
        }
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

  const changeRealm = useCallback((realmId: string): void => {
    setSettings((previous) => ({ ...previous, activeRealmId: realmId }))
    void api.realms.activate(realmId)
    setRoute((current) => (current.name === 'realms' ? current : { name: 'games' }))
  }, [])

  const refreshRealms = useCallback(async (): Promise<void> => {
    try {
      const loaded = await api.realms.list()
      setRealms(loaded)
      setSettings((previous) => {
        const active =
          loaded.find((realm) => realm.id === previous.activeRealmId) ?? loaded[0] ?? null

        if (!active) return { ...previous, activeRealmId: null }
        if (active.id !== previous.activeRealmId) void api.realms.activate(active.id)
        return { ...previous, activeRealmId: active.id }
      })
    } catch {
      // Страница сеттингов покажет ошибку сама.
    }
  }, [])

  return (
    <div className={`app${route.name === 'game' ? ' app--full' : ''}`}>
      {route.name !== 'game' ? (
        <Sidebar
          route={route}
          onNavigate={setRoute}
          realms={realms}
          activeRealmId={settings.activeRealmId}
          onRealmChange={changeRealm}
        />
      ) : null}

      <div className="app__content" key={settings.activeRealmId ?? 'loading'}>
        {route.name === 'games' ? (
          <GamesPage onOpenGame={(id) => setRoute({ name: 'game', id })} />
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
            onOpenPlayers={() => setRoute({ name: 'players' })}
            onOpenPlayer={(id) => setRoute({ name: 'player', id, from: 'characters' })}
          />
        ) : null}

        {route.name === 'monsters' ? <MonstersPage /> : null}

        {route.name === 'savedMonsters' ? <SavedMonstersPage /> : null}

        {route.name === 'maps' ? (
          <MapsPage
            realms={realms}
            activeRealmId={settings.activeRealmId}
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
            activeRealmId={settings.activeRealmId}
            onActivate={changeRealm}
            onOpenRealm={(id) => setRoute({ name: 'realm', id })}
            onChanged={() => void refreshRealms()}
          />
        ) : null}

        {route.name === 'realm' ? (
          <RealmDetailPage
            realm={realms.find((realm) => realm.id === route.id) ?? null}
            active={settings.activeRealmId === route.id}
            onActivate={() => changeRealm(route.id)}
            onBack={() => setRoute({ name: 'realms' })}
          />
        ) : null}

        {route.name === 'settings' ? (
          <SettingsPage settings={settings} onThemeChange={changeTheme} />
        ) : null}
      </div>
    </div>
  )
}
