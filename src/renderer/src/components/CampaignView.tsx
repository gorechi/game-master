import { useState } from 'react'
import type { JSX } from 'react'
import { useCampaignSession } from '@renderer/hooks/useCampaignSession'
import { formatDateTime } from '@renderer/lib/format'
import type { SaveState } from '@renderer/hooks/useCampaignSession'
import { InitiativeBoard } from './InitiativeBoard'
import { PartyRoster } from './PartyRoster'
import { NotesEditor } from './NotesEditor'

type Tab = 'initiative' | 'party' | 'notes'

interface CampaignViewProps {
  campaignId: string
  onBack: () => void
}

export function CampaignView({ campaignId, onBack }: CampaignViewProps): JSX.Element {
  const { campaign, saveState, loadError, update } = useCampaignSession(campaignId)
  const [tab, setTab] = useState<Tab>('initiative')

  if (loadError) {
    return (
      <main className="campaign campaign--error">
        <p className="notice notice--error">Не удалось открыть кампанию: {loadError}</p>
        <button className="button" onClick={onBack}>
          ← К списку кампаний
        </button>
      </main>
    )
  }

  if (!campaign) {
    return (
      <main className="campaign">
        <p className="muted">Открываем кампанию…</p>
      </main>
    )
  }

  return (
    <main className="campaign">
      <header className="campaign__bar">
        <button className="icon-button" onClick={onBack} title="К списку кампаний">
          ←
        </button>
        <input
          className="campaign__title"
          value={campaign.name}
          placeholder="Без названия"
          aria-label="Название кампании"
          maxLength={120}
          onChange={(event) => update((draft) => ({ ...draft, name: event.target.value }))}
        />
        <SaveBadge state={saveState} />
      </header>

      <nav className="tabs" role="tablist">
        <TabButton
          active={tab === 'initiative'}
          onClick={() => setTab('initiative')}
          label="Инициатива"
          hint={`${campaign.encounter.combatants.length}`}
        />
        <TabButton
          active={tab === 'party'}
          onClick={() => setTab('party')}
          label="Группа"
          hint={`${campaign.characters.length}`}
        />
        <TabButton active={tab === 'notes'} onClick={() => setTab('notes')} label="Заметки" />
      </nav>

      <section className="campaign__panel">
        {tab === 'initiative' ? <InitiativeBoard campaign={campaign} update={update} /> : null}
        {tab === 'party' ? <PartyRoster campaign={campaign} update={update} /> : null}
        {tab === 'notes' ? <NotesEditor campaign={campaign} update={update} /> : null}
      </section>
    </main>
  )
}

function TabButton({
  active,
  label,
  hint,
  onClick
}: {
  active: boolean
  label: string
  hint?: string
  onClick: () => void
}): JSX.Element {
  return (
    <button
      role="tab"
      aria-selected={active}
      className={`tab${active ? ' tab--active' : ''}`}
      onClick={onClick}
    >
      {label}
      {hint ? <span className="tab__hint">{hint}</span> : null}
    </button>
  )
}

function SaveBadge({ state }: { state: SaveState }): JSX.Element {
  switch (state.kind) {
    case 'loading':
      return <span className="save save--muted">Загрузка…</span>
    case 'saved':
      return (
        <span className="save save--ok" title={formatDateTime(state.savedAt)}>
          Сохранено
        </span>
      )
    case 'pending':
      return <span className="save save--muted">Есть изменения</span>
    case 'saving':
      return <span className="save save--muted">Сохранение…</span>
    case 'error':
      return (
        <span className="save save--error" title={state.message}>
          Ошибка сохранения
        </span>
      )
  }
}
