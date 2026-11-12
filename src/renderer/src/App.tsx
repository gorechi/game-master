import { useState } from 'react'
import type { JSX } from 'react'
import { Library } from './components/Library'
import { CampaignView } from './components/CampaignView'

type Screen = { name: 'library' } | { name: 'campaign'; id: string }

export default function App(): JSX.Element {
  const [screen, setScreen] = useState<Screen>({ name: 'library' })

  if (screen.name === 'campaign') {
    return (
      <CampaignView
        campaignId={screen.id}
        onBack={() => setScreen({ name: 'library' })}
      />
    )
  }

  return <Library onOpen={(id) => setScreen({ name: 'campaign', id })} />
}
