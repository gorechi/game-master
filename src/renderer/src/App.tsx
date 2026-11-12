import { useState } from 'react'
import type { JSX } from 'react'
import { Sidebar } from './components/Sidebar'
import { PlayersPage } from './components/PlayersPage'
import { Library } from './components/Library'
import { CampaignView } from './components/CampaignView'
import type { Route } from './lib/routes'

export default function App(): JSX.Element {
  const [route, setRoute] = useState<Route>({ name: 'players' })

  return (
    <div className="app">
      <Sidebar route={route} onNavigate={setRoute} />

      <div className="app__content">
        {route.name === 'players' ? <PlayersPage /> : null}

        {route.name === 'campaigns' ? (
          <Library onOpen={(id) => setRoute({ name: 'campaign', id })} />
        ) : null}

        {route.name === 'campaign' ? (
          <CampaignView
            campaignId={route.id}
            onBack={() => setRoute({ name: 'campaigns' })}
          />
        ) : null}
      </div>
    </div>
  )
}
