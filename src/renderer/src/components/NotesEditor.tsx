import type { JSX } from 'react'
import type { Campaign } from '@shared/campaign'

interface NotesEditorProps {
  campaign: Campaign
  update: (mutator: (draft: Campaign) => Campaign) => void
}

export function NotesEditor({ campaign, update }: NotesEditorProps): JSX.Element {
  const words = campaign.notes.trim() ? campaign.notes.trim().split(/\s+/).length : 0

  return (
    <div className="notes">
      <div className="notes__head">
        <h2>Заметки кампании</h2>
        <span className="muted">
          {words} {words === 1 ? 'слово' : 'слов'}
        </span>
      </div>
      <textarea
        className="notes__area"
        value={campaign.notes}
        placeholder="Сюжетные линии, тайны, обещания игрокам, лут, NPC…"
        spellCheck={false}
        onChange={(event) => update((draft) => ({ ...draft, notes: event.target.value }))}
      />
    </div>
  )
}
