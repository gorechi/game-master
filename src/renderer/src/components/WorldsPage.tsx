import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { World } from '@shared/world'
import { api, errorMessage } from '@renderer/lib/api'
import { pluralize } from '@renderer/lib/format'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { IconMap, IconPencil, IconPlus, IconTrash } from './ui/icons'
import { WorldFormModal } from './worlds/WorldFormModal'

interface WorldsPageProps {
  onOpenWorld: (worldId: string) => void
}

type WorldFormState = { mode: 'create' } | { mode: 'edit'; world: World }

/** Сеттинги: пространства, в которых проходят игры. */
export function WorldsPage({ onOpenWorld }: WorldsPageProps): JSX.Element {
  const [worlds, setWorlds] = useState<World[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<WorldFormState | null>(null)
  const [deleting, setDeleting] = useState<World | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setWorlds(await api.worlds.list())
      setError(null)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function confirmDelete(): Promise<void> {
    if (!deleting) return

    try {
      await api.worlds.remove(deleting.id)
      setDeleting(null)
      await refresh()
    } catch (caught) {
      setError(errorMessage(caught))
      setDeleting(null)
    }
  }

  return (
    <main className="page">
      <div className="page__inner">
        <header className="page-head">
          <div>
            <h1>Сеттинги</h1>
            <p className="muted">
              Пространства, в которых проходят игры: места и пути между ними.
            </p>
          </div>
          <button
            className="button button--primary"
            onClick={() => setForm({ mode: 'create' })}
          >
            <IconPlus width={16} height={16} />
            Создать сеттинг
          </button>
        </header>

        {error ? <p className="notice notice--error">{error}</p> : null}

        {worlds === null ? (
          <p className="muted">Загружаем сеттинги…</p>
        ) : worlds.length === 0 ? (
          <div className="empty empty--action">
            <p>
              Пока ни одного сеттинга. Создайте первый — добавьте места и соедините их путями.
            </p>
            <button className="button" onClick={() => setForm({ mode: 'create' })}>
              Создать сеттинг
            </button>
          </div>
        ) : (
          <>
            <p className="list-caption">
              {worlds.length} {pluralize(worlds.length, 'сеттинг', 'сеттинга', 'сеттингов')}
            </p>

            <ul className="world-list">
              {worlds.map((world) => (
                <li className="world-card" key={world.id}>
                  <span className="world-card__sigil" aria-hidden="true">
                    <IconMap width={22} height={22} />
                  </span>

                  <div className="world-card__identity">
                    <h3 className="world-card__name">{world.name}</h3>
                    <span className="world-card__meta">
                      {world.places.length}{' '}
                      {pluralize(world.places.length, 'место', 'места', 'мест')} ·{' '}
                      {world.paths.length}{' '}
                      {pluralize(world.paths.length, 'путь', 'пути', 'путей')}
                    </span>
                  </div>

                  <div className="world-card__actions">
                    <button
                      type="button"
                      className="button button--tiny button--primary"
                      onClick={() => onOpenWorld(world.id)}
                    >
                      Просмотр
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      title="Редактировать"
                      aria-label={`Редактировать сеттинг ${world.name}`}
                      onClick={() => setForm({ mode: 'edit', world })}
                    >
                      <IconPencil />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button--danger"
                      title="Удалить"
                      aria-label={`Удалить сеттинг ${world.name}`}
                      onClick={() => setDeleting(world)}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <WorldFormModal
        open={form !== null}
        world={form?.mode === 'edit' ? form.world : null}
        onClose={() => setForm(null)}
        onSaved={() => {
          setForm(null)
          void refresh()
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Удалить сеттинг?"
        description={
          deleting
            ? `«${deleting.name}» и все его места и пути будут удалены. Это действие нельзя отменить.`
            : undefined
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  )
}
