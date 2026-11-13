import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import { DEFAULT_SETTINGS, type AppSettings, type ThemeName } from '@shared/settings'
import { Sidebar } from './components/Sidebar'
import { GamesPage } from './components/GamesPage'
import { GameRunPage } from './components/GameRunPage'
import { PlayersPage } from './components/PlayersPage'
import { PlayerCharactersPage } from './components/PlayerCharactersPage'
import { CharactersPage } from './components/CharactersPage'
import { MonstersPage } from './components/MonstersPage'
import { MapsPage } from './components/MapsPage'
import { MapGraphPage } from './components/MapGraphPage'
import { SettingsPage } from './components/SettingsPage'
import { api } from './lib/api'
import { applyTheme } from './lib/theme'
import type { Route } from './lib/routes'

export default function App(): JSX.Element {
  const [route, setRoute] = useState<Route>({ name: 'games' })
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    let cancelled = false

    void api.settings
      .get()
      .then((loaded) => {
        if (cancelled) return
        setSettings(loaded)
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

  return (
    <div className="app">
      <Sidebar route={route} onNavigate={setRoute} />

      <div className="app__content">
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

        {route.name === 'maps' ? (
          <MapsPage onOpenMap={(id) => setRoute({ name: 'map', id })} />
        ) : null}

        {route.name === 'map' ? (
          <MapGraphPage
            mapId={route.id}
            onBack={() => setRoute({ name: 'maps' })}
            onOpenMap={(id) => setRoute({ name: 'map', id })}
          />
        ) : null}

        {route.name === 'settings' ? (
          <SettingsPage settings={settings} onThemeChange={changeTheme} />
        ) : null}
      </div>
    </div>
  )
}
