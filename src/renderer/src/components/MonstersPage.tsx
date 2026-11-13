import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { Monster } from '@shared/monster'
import { api, errorMessage } from '@renderer/lib/api'
import { pluralize } from '@renderer/lib/format'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { IconPlus } from './ui/icons'
import { MonsterCard } from './monsters/MonsterCard'
import { MonsterFormModal } from './monsters/MonsterFormModal'

/** Бестиарий: монстры, которых можно использовать в игре. */
export function MonstersPage(): JSX.Element {
  const [monsters, setMonsters] = useState<Monster[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Monster | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Monster | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setMonsters(await api.monsters.list())
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
      await api.monsters.remove(deleting.id)
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
            <h1>Монстры</h1>
            <p className="muted">
              Бестиарий: характеристики, классы и способности. Все записи можно использовать в игре.
            </p>
          </div>
          <button className="button button--primary" onClick={() => setEditing('new')}>
            <IconPlus width={16} height={16} />
            Добавить монстра
          </button>
        </header>

        {error ? <p className="notice notice--error">{error}</p> : null}

        {monsters === null ? (
          <p className="muted">Загружаем бестиарий…</p>
        ) : monsters.length === 0 ? (
          <div className="empty empty--action">
            <p>Пока ни одного монстра. Добавьте первого — с характеристиками и способностями.</p>
            <button className="button" onClick={() => setEditing('new')}>
              Добавить монстра
            </button>
          </div>
        ) : (
          <>
            <p className="list-caption">
              {monsters.length} {pluralize(monsters.length, 'монстр', 'монстра', 'монстров')}
            </p>

            <ul className="monster-list">
              {monsters.map((monster) => (
                <MonsterCard
                  key={monster.id}
                  monster={monster}
                  onEdit={() => setEditing(monster)}
                  onDelete={() => setDeleting(monster)}
                />
              ))}
            </ul>
          </>
        )}
      </div>

      <MonsterFormModal
        open={editing !== null}
        title={editing === 'new' ? 'Новый монстр' : 'Редактировать монстра'}
        description="Характеристики, классы и способности. Способности можно добавлять и удалять."
        initial={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSubmit={async (input) => {
          if (editing === 'new') {
            await api.monsters.create(input)
          } else if (editing) {
            await api.monsters.update({ ...editing, ...input })
          }

          setEditing(null)
          await refresh()
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Удалить монстра?"
        description={
          deleting
            ? `«${deleting.name}» будет удалён из бестиария вместе со способностями. Это действие нельзя отменить.`
            : undefined
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  )
}
