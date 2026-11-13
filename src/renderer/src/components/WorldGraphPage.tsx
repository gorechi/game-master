import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { World } from '@shared/world'
import { api, errorMessage } from '@renderer/lib/api'
import { pluralize } from '@renderer/lib/format'
import { IconPencil } from './ui/icons'
import { WorldFormModal } from './worlds/WorldFormModal'
import { WorldGraph } from './worlds/WorldGraph'

interface WorldGraphPageProps {
  worldId: string
  onBack: () => void
}

/** Просмотр сеттинга: карта мест и путей. */
export function WorldGraphPage({ worldId, onBack }: WorldGraphPageProps): JSX.Element {
  const [world, setWorld] = useState<World | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    try {
      const worlds = await api.worlds.list()
      setWorld(worlds.find((item) => item.id === worldId) ?? null)
      setError(null)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }, [worldId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <main className="page">
      <div className="page__inner">
        <div className="page-block">
          <button
            type="button"
            className="button button--ghost button--tiny page-back"
            onClick={onBack}
          >
            ← Сеттинги
          </button>

          <header className="page-head">
            <div>
              <p className="page-kicker">Карта сеттинга</p>
              <h1>{world ? world.name : 'Сеттинг'}</h1>
              <p className="muted">
                {world
                  ? `${world.places.length} ${pluralize(
                      world.places.length,
                      'место',
                      'места',
                      'мест'
                    )} · ${world.paths.length} ${pluralize(
                      world.paths.length,
                      'путь',
                      'пути',
                      'путей'
                    )}`
                  : 'Загружаем сеттинг…'}
              </p>
            </div>

            {world ? (
              <div className="world-view-actions">
                <button className="button" onClick={() => setEditing(true)}>
                  <IconPencil width={15} height={15} />
                  Редактировать
                </button>
              </div>
            ) : null}
          </header>
        </div>

        {error ? <p className="notice notice--error">{error}</p> : null}

        {world === null ? (
          <div className="empty">
            <p>Сеттинг не найден — возможно, запись уже удалена.</p>
            <button className="button" onClick={onBack}>
              Вернуться к сеттингам
            </button>
          </div>
        ) : world === undefined ? (
          <p className="muted">Загружаем карту…</p>
        ) : (
          <section className="world-graph-card">
            <div className="world-graph-card__legend">
              <span>
                <i className="world-legend__line" aria-hidden="true" />
                Путь между местами
              </span>
              <span>
                <span className="world-badge">Выход</span>
                Выход из сеттинга
              </span>
            </div>

            <div className="world-graph-scroll">
              <WorldGraph world={world} />
            </div>
          </section>
        )}
      </div>

      <WorldFormModal
        open={editing}
        world={world ?? null}
        onClose={() => setEditing(false)}
        onSaved={(saved) => {
          setWorld(saved)
          setEditing(false)
        }}
      />
    </main>
  )
}
