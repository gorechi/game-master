import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { Monster } from '@shared/monster'
import { formatChallengeRating } from '@shared/domain'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'

interface BaseMonsterModalProps {
  open: boolean
  monsters: readonly Monster[]
  onClose: () => void
  onChoose: (monster: Monster) => void
}

/** Первый шаг создания уникального монстра: выбор основы из бестиария. */
export function BaseMonsterModal({
  open,
  monsters,
  onClose,
  onChoose
}: BaseMonsterModalProps): JSX.Element {
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    if (open) setSelectedId('')
  }, [open])

  const selected = monsters.find((monster) => monster.id === selectedId)

  return (
    <Modal
      open={open}
      title="Новый уникальный монстр"
      description="Выберите базового монстра из бестиария, затем настройте экземпляр."
      size="md"
      panelClassName="modal--base-monster"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="button button--primary"
            disabled={!selected}
            onClick={() => selected && onChoose(selected)}
          >
            Далее
          </button>
        </>
      }
    >
      <div className="base-monster-picker">
        {monsters.length === 0 ? (
          <p className="notice">
            В бестиарии пока нет монстров. Сначала добавьте хотя бы одного в разделе «Монстры».
          </p>
        ) : (
          <div className="field">
            <span className="field__label">Базовый монстр</span>
            <Select
              ariaLabel="Базовый монстр из бестиария"
              value={selectedId}
              searchable
              placeholder="Найти монстра…"
              options={monsters.map((monster) => ({
                value: monster.id,
                label: `${monster.name} · КО ${formatChallengeRating(monster.challengeRating)}`
              }))}
              onChange={setSelectedId}
            />
          </div>
        )}

        {selected ? (
          <p className="base-monster-picker__hint">
            Будет создан отдельный экземпляр на основе «{selected.name}». Изменения не затронут
            бестиарий.
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
