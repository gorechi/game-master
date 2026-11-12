import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, JSX } from 'react'
import type { CampaignSummary } from '@shared/campaign'
import { api, errorMessage, isWebPreview } from '@renderer/lib/api'
import { resetWebPreview } from '@renderer/lib/webBridge'
import { formatDateTime, pluralize } from '@renderer/lib/format'
import { ConfirmDialog } from './ui/ConfirmDialog'

interface LibraryProps {
  onOpen: (campaignId: string) => void
}

export function Library({ onOpen }: LibraryProps): JSX.Element {
  const [campaigns, setCampaigns] = useState<CampaignSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [pendingRemoval, setPendingRemoval] = useState<CampaignSummary | null>(null)

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

  async function confirmRemoval(): Promise<void> {
    if (!pendingRemoval) return

    try {
      await api.campaigns.remove(pendingRemoval.id)
      setPendingRemoval(null)
      await refresh()
    } catch (caught) {
      setError(errorMessage(caught))
      setPendingRemoval(null)
    }
  }

  return (
    <main className="page">
      <div className="page__inner">
        <header className="page-head">
          <div>
            <h1>Кампании</h1>
            <p className="muted">Партии, планы и заметки мастера. Игроки — в отдельной базе слева.</p>
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
            <h2>Ваши кампании</h2>
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
                          ? `${summary.playerCount} ${pluralize(
                              summary.playerCount,
                              'персонаж игрока',
                              'персонажа игроков',
                              'персонажей игроков'
                            )}`
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
                      onClick={() => setPendingRemoval(summary)}
                    >
                      Удалить
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={pendingRemoval !== null}
        title="Удалить кампанию?"
        description={
          pendingRemoval
            ? `«${pendingRemoval.name}» будет перемещена в корзину — файл можно восстановить.`
            : undefined
        }
        confirmLabel="Удалить"
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => void confirmRemoval()}
      />
    </main>
  )
}
