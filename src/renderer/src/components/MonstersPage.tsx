import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { Monster } from '@shared/monster'
import type { Realm } from '@shared/realm'
import { api, errorMessage } from '@renderer/lib/api'
import { useI18n } from '@renderer/i18n/LocaleProvider'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { IconPlus } from './ui/icons'
import { MonsterCard } from './monsters/MonsterCard'
import { MonsterFormModal } from './monsters/MonsterFormModal'

/** Бестиарий: монстры, которых можно использовать в игре. */
export function MonstersPage({ realms }: { realms: readonly Realm[] }): JSX.Element {
  const { messages: m, fill, plural } = useI18n()
  const [monsters, setMonsters] = useState<Monster[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Monster | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Monster | null>(null)

  const realmNames = new Map(realms.map((realm) => [realm.id, realm.name]))

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
            <h1>{m.bestiary.page.title}</h1>
            <p className="muted">{m.bestiary.page.description}</p>
          </div>
          <button className="button button--primary" onClick={() => setEditing('new')}>
            <IconPlus width={16} height={16} />
            {m.bestiary.page.add}
          </button>
        </header>

        {error ? <p className="notice notice--error">{error}</p> : null}

        {monsters === null ? (
          <p className="muted">{m.bestiary.page.loading}</p>
        ) : monsters.length === 0 ? (
          <div className="empty empty--action">
            <p>{m.bestiary.page.empty}</p>
            <button className="button" onClick={() => setEditing('new')}>
              {m.bestiary.page.add}
            </button>
          </div>
        ) : (
          <>
            <p className="list-caption">
              {plural(monsters.length, m.bestiary.page.monstersCount)}
            </p>

            <ul className="monster-list">
              {monsters.map((monster) => (
                <MonsterCard
                  key={monster.id}
                  monster={monster}
                  realmName={realmNames.get(monster.realmId) ?? m.bestiary.page.noRealm}
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
        title={editing === 'new' ? m.bestiary.form.createTitle : m.bestiary.form.editTitle}
        description={m.bestiary.form.description}
        initial={editing === 'new' ? null : editing}
        realms={realms}
        lockRealm={editing !== 'new'}
        onClose={() => setEditing(null)}
        onSubmit={async (input, realmId) => {
          if (editing === 'new') {
            if (!realmId) throw new Error(m.bestiary.page.realmRequired)
            await api.monsters.create(input, realmId)
          } else if (editing) {
            await api.monsters.update({ ...editing, ...input })
          }

          setEditing(null)
          await refresh()
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={m.bestiary.page.deleteTitle}
        description={
          deleting
            ? fill(m.bestiary.page.deleteDescription, { name: deleting.name })
            : undefined
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  )
}
