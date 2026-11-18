import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { GameMonsterEntry } from '@shared/gameMonster'
import type { Monster } from '@shared/monster'
import type { Realm } from '@shared/realm'
import { api, errorMessage } from '@renderer/lib/api'
import { useI18n } from '@renderer/i18n/LocaleProvider'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { IconPlus } from './ui/icons'
import { MonsterCard } from './monsters/MonsterCard'
import {
  MonsterFormModal,
  type MonsterFormSubmission
} from './monsters/MonsterFormModal'
import { BaseMonsterModal } from './savedMonsters/BaseMonsterModal'

/** Сохранённые игровые монстры: уникальные экземпляры вне бестиария. */
export function SavedMonstersPage({ realms }: { realms: readonly Realm[] }): JSX.Element {
  const { messages: m, fill, plural } = useI18n()
  const [monsters, setMonsters] = useState<GameMonsterEntry[] | null>(null)
  const [bestiary, setBestiary] = useState<Monster[]>([])
  const [error, setError] = useState<string | null>(null)
  const [choosingBase, setChoosingBase] = useState(false)
  const [manualCreate, setManualCreate] = useState(false)
  const [baseMonster, setBaseMonster] = useState<Monster | null>(null)
  const [editing, setEditing] = useState<GameMonsterEntry | null>(null)
  const [deleting, setDeleting] = useState<GameMonsterEntry | null>(null)

  const realmNames = new Map(realms.map((realm) => [realm.id, realm.name]))

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const [saved, nextBestiary] = await Promise.all([
        api.gameMonsters.list(),
        api.monsters.list()
      ])
      setMonsters(saved)
      setBestiary(nextBestiary)
      setError(null)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  function chooseBase(monster: Monster): void {
    setManualCreate(false)
    setChoosingBase(false)
    setBaseMonster(monster)
  }

  function startManualCreate(): void {
    setChoosingBase(false)
    setBaseMonster(null)
    setEditing(null)
    setManualCreate(true)
  }

  async function createMonster(
    input: MonsterFormSubmission,
    realmId: string | null
  ): Promise<void> {
    const targetRealmId = baseMonster?.realmId ?? realmId
    if (!targetRealmId) return

    await api.gameMonsters.create(
      { ...input, sourceMonsterId: baseMonster?.id ?? null },
      targetRealmId
    )
    setBaseMonster(null)
    setManualCreate(false)
    await refresh()
  }

  async function updateMonster(input: MonsterFormSubmission): Promise<void> {
    if (!editing) return

    await api.gameMonsters.update({ ...editing, ...input })
    setEditing(null)
    await refresh()
  }

  async function confirmDelete(): Promise<void> {
    if (!deleting) return

    try {
      await api.gameMonsters.remove(deleting.id)
      setDeleting(null)
      await refresh()
    } catch (caught) {
      setError(errorMessage(caught))
      setDeleting(null)
    }
  }

  const formOpen = manualCreate || baseMonster !== null || editing !== null
  const formInitial = baseMonster ?? editing
  const formTitle = editing ? m.bestiary.saved.editTitle : m.bestiary.saved.createTitle
  const formDescription = editing
    ? m.bestiary.saved.editDescription
    : baseMonster
      ? fill(m.bestiary.saved.createDescription, { name: baseMonster.name })
      : m.bestiary.saved.createManualDescription

  return (
    <main className="page">
      <div className="page__inner">
        <header className="page-head">
          <div>
            <h1>{m.bestiary.saved.title}</h1>
            <p className="muted">{m.bestiary.saved.description}</p>
          </div>
          <div className="page-head__actions">
            {bestiary.length > 0 ? (
              <button className="button" onClick={() => setChoosingBase(true)}>
                {m.bestiary.saved.createFromBestiary}
              </button>
            ) : null}
            <button className="button button--primary" onClick={startManualCreate}>
              <IconPlus width={16} height={16} />
              {m.bestiary.saved.create}
            </button>
          </div>
        </header>

        {error ? <p className="notice notice--error">{error}</p> : null}

        {monsters === null ? (
          <p className="muted">{m.bestiary.saved.loading}</p>
        ) : monsters.length === 0 ? (
          <div className="empty empty--action">
            <p>{m.bestiary.saved.empty}</p>
            <button className="button" onClick={startManualCreate}>
              {m.bestiary.saved.create}
            </button>
          </div>
        ) : (
          <>
            <p className="list-caption">
              {plural(monsters.length, m.bestiary.saved.libraryCount)}
            </p>

            <ul className="monster-list">
              {monsters.map((monster) => (
                <MonsterCard
                  key={monster.id}
                  monster={monster}
                  realmName={realmNames.get(monster.realmId) ?? m.bestiary.saved.noRealm}
                  badge={m.bestiary.saved.uniqueBadge}
                  statuses={monster.statuses}
                  onEdit={() => setEditing(monster)}
                  onDelete={() => setDeleting(monster)}
                />
              ))}
            </ul>
          </>
        )}
      </div>

      <BaseMonsterModal
        open={choosingBase}
        monsters={bestiary}
        realms={realms}
        onClose={() => setChoosingBase(false)}
        onChoose={chooseBase}
      />

      <MonsterFormModal
        open={formOpen}
        title={formTitle}
        description={formDescription}
        initial={formInitial}
        realms={realms}
        lockRealm={editing !== null || baseMonster !== null}
        allowZeroHitPoints
        showStatuses
        onClose={() => {
          setManualCreate(false)
          setBaseMonster(null)
          setEditing(null)
        }}
        onSubmit={(input, realmId) =>
          editing ? updateMonster(input) : createMonster(input, realmId)
        }
      />

      <ConfirmDialog
        open={deleting !== null}
        title={m.bestiary.saved.deleteTitle}
        description={
          deleting
            ? fill(m.bestiary.saved.deleteDescription, { name: deleting.name })
            : undefined
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  )
}
