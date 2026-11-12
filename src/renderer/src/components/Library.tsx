import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, JSX } from 'react'
import type { CampaignSummary } from '@shared/campaign'
import { api, errorMessage, isWebPreview } from '@renderer/lib/api'
import { resetWebPreview } from '@renderer/lib/webBridge'
import { formatDateTime, pluralize } from '@renderer/lib/format'

interface LibraryProps {
  onOpen: (campaignId: string) => void
}

export function Library({ onOpen }: LibraryProps): JSX.Element {
  const [campaigns, setCampaigns] = useState<CampaignSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setCampaigns(await api.campaigns.list())
      setError(null)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function handleCreate(event: FormEvent): Promise<void> {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || creating) return

    setCreating(true)
    try {
      const campaign = await api.campaigns.create({ name: trimmed })
      setName('')
      onOpen(campaign.id)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setCreating(false)
    }
  }

  async function handleRemove(summary: CampaignSummary): Promise<void> {
    const confirmed = window.confirm(
      `Удалить кампанию «${summary.name}»?\n\nФайл будет перемещён в корзину — его можно восстановить.`
    )
    if (!confirmed) return

    try {
      await api.campaigns.remove(summary.id)
      await refresh()
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  return (
    <main className="library">
      <header className="hero">
        <div className="hero__brand">
          <span className="hero__die" aria-hidden="true">
            <DieIcon />
          </span>
          <div>
            <h1>Game Master</h1>
            <p>Рабочее место мастера: инициатива, состав группы и заметки по партии.</p>
          </div>
        </div>
        {isWebPreview ? (
          <div className="hero__preview">
            <span className="badge badge--preview">Веб-предпросмотр</span>
            <button className="button button--ghost" onClick={resetWebPreview}>
              Сбросить данные
            </button>
          </div>
        ) : (
          <button className="button button--ghost" onClick={() => void api.app.openDataFolder()}>
            Папка с кампаниями
          </button>
        )}
      </header>

      <section className="create">
        <form onSubmit={(event) => void handleCreate(event)} className="create__form">
          <label className="field">
            <span className="field__label">Новая кампания</span>
            <input
              className="input"
              placeholder="«Проклятие Страда», «Дом в Эленвилле»…"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
            />
          </label>
          <button className="button button--primary" type="submit" disabled={!name.trim() || creating}>
            {creating ? 'Создаём…' : 'Создать'}
          </button>
        </form>
        {error ? <p className="notice notice--error">{error}</p> : null}
      </section>

      <section className="campaigns">
        <div className="campaigns__head">
          <h2>Кампании</h2>
          {campaigns ? <span className="muted">{campaigns.length}</span> : null}
        </div>

        {campaigns === null ? (
          <p className="muted">Загружаем…</p>
        ) : campaigns.length === 0 ? (
          <div className="empty">
            <p>
              {isWebPreview
                ? 'Пока ни одной кампании. Создайте первую — данные сохранятся в браузере.'
                : 'Пока ни одной кампании. Создайте первую — файл появится на диске автоматически.'}
            </p>
          </div>
        ) : (
          <ul className="campaign-grid">
            {campaigns.map((summary) => (
              <li key={summary.id} className="campaign-card">
                <button className="campaign-card__open" onClick={() => onOpen(summary.id)}>
                  <span className="campaign-card__name">{summary.name}</span>
                  {summary.problem ? (
                    <span className="badge badge--error">Файл повреждён</span>
                  ) : (
                    <span className="campaign-card__meta">
                      {summary.playerCount > 0
                        ? `${summary.playerCount} ${pluralize(summary.playerCount, 'игрок', 'игрока', 'игроков')}`
                        : 'Нет персонажей игроков'}
                      {summary.combatantCount > 0 ? ` · в бою ${summary.combatantCount}` : ''}
                    </span>
                  )}
                  <span className="campaign-card__date">
                    {summary.problem ?? `Изменена ${formatDateTime(summary.updatedAt)}`}
                  </span>
                </button>
                <div className="campaign-card__actions">
                  <button
                    className="button button--tiny"
                    title="Показать файл на диске"
                    onClick={() => void api.campaigns.reveal(summary.id)}
                  >
                    Файл
                  </button>
                  <button
                    className="button button--tiny button--danger"
                    onClick={() => void handleRemove(summary)}
                  >
                    Удалить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

function DieIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 48 48" width="34" height="34" role="img" aria-label="d20">
      <path
        d="M24 3 44 14.5v19L24 45 4 33.5v-19L24 3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M24 14 36 35H12L24 14Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.75"
      />
    </svg>
  )
}
