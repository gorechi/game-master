import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { GameMonsterEntry } from '@shared/gameMonster'
import type { Monster, MonsterInput } from '@shared/monster'
import { api, errorMessage } from '@renderer/lib/api'
import { pluralize } from '@renderer/lib/format'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { IconPlus } from './ui/icons'
import { MonsterCard } from './monsters/MonsterCard'
import { MonsterFormModal } from './monsters/MonsterFormModal'
import { BaseMonsterModal } from './savedMonsters/BaseMonsterModal'

/** Сохранённые игровые монстры: уникальные экземпляры вне бестиария. */
export function SavedMonstersPage(): JSX.Element {
  const [monsters, setMonsters] = useState<GameMonsterEntry[] | null>(null)
  const [bestiary, setBestiary] = useState<Monster[]>([])
  const [error, setError] = useState<string | null>(null)
  const [choosingBase, setChoosingBase] = useState(false)
  const [baseMonster, setBaseMonster] = useState<Monster | null>(null)
  const [editing, setEditing] = useState<GameMonsterEntry | null>(null)
  const [deleting, setDeleting] = useState<GameMonsterEntry | null>(null)

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
    setChoosingBase(false)
    setBaseMonster(monster)
  }

  async function createMonster(input: MonsterInput): Promise<void> {
    if (!baseMonster) return

    await api.gameMonsters.create({ ...input, sourceMonsterId: baseMonster.id })
    setBaseMonster(null)
    await refresh()
  }

  async function updateMonster(input: MonsterInput): Promise<void> {
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

  const formOpen = baseMonster !== null || editing !== null
  const formInitial = baseMonster ?? editing
  const formTitle = editing ? 'Редактировать уникального монстра' : 'Настройка уникального монстра'
  const formDescription = editing
    ? 'Изменяется только этот экземпляр. Бестиарий остаётся нетронутым.'
    : baseMonster
      ? `Экземпляр на основе «${baseMonster.name}». Изменения не затрагивают бестиарий.`
      : undefined

  return (
    <main className="page">
      <div className="page__inner">
        <header className="page-head">
          <div>
            <h1>Сохранённые монстры</h1>
            <p className="muted">
              Уникальные экземпляры для будущих игр. Это отдельная библиотека — бестиарий она
              не меняет.
            </p>
          </div>
          <button className="button button--primary" onClick={() => setChoosingBase(true)}>
            <IconPlus width={16} height={16} />
            Создать монстра
          </button>
        </header>

        {error ? <p className="notice notice--error">{error}</p> : null}

        {monsters === null ? (
          <p className="muted">Загружаем сохранённых монстров…</p>
        ) : monsters.length === 0 ? (
          <div className="empty empty--action">
            <p>
              Пока ни одного сохранённого монстра. Создайте уникального или сохраните монстров
              при завершении игры.
            </p>
            <button className="button" onClick={() => setChoosingBase(true)}>
              Создать монстра
            </button>
          </div>
        ) : (
          <>
            <p className="list-caption">
              {monsters.length} {pluralize(monsters.length, 'монстр', 'монстра', 'монстров')} в
              библиотеке
            </p>

            <ul className="monster-list">
              {monsters.map((monster) => (
                <MonsterCard
                  key={monster.id}
                  monster={monster}
                  badge="Уникальный"
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
        onClose={() => setChoosingBase(false)}
        onChoose={chooseBase}
      />

      <MonsterFormModal
        open={formOpen}
        title={formTitle}
        description={formDescription}
        initial={formInitial}
        onClose={() => {
          setBaseMonster(null)
          setEditing(null)
        }}
        onSubmit={(input) => (editing ? updateMonster(input) : createMonster(input))}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Удалить сохранённого монстра?"
        description={
          deleting
            ? `«${deleting.name}» будет удалён из библиотеки уникальных монстров. Это действие нельзя отменить.`
            : undefined
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  )
}
