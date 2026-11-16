import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { Monster } from '@shared/monster'
import type { Realm } from '@shared/realm'
import { formatChallengeRating } from '@shared/domain'
import { useI18n } from '@renderer/i18n/LocaleProvider'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'

interface BaseMonsterModalProps {
  open: boolean
  monsters: readonly Monster[]
  realms: readonly Realm[]
  onClose: () => void
  onChoose: (monster: Monster) => void
}

/** Первый шаг создания уникального монстра: выбор основы из бестиария. */
export function BaseMonsterModal({
  open,
  monsters,
  realms,
  onClose,
  onChoose
}: BaseMonsterModalProps): JSX.Element {
  const { messages: m, fill } = useI18n()
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    if (open) setSelectedId('')
  }, [open])

  const selected = monsters.find((monster) => monster.id === selectedId)
  const realmNames = new Map(realms.map((realm) => [realm.id, realm.name]))

  return (
    <Modal
      open={open}
      title={m.bestiary.base.title}
      description={m.bestiary.base.description}
      size="md"
      panelClassName="modal--base-monster"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button" onClick={onClose}>
            {m.bestiary.base.cancel}
          </button>
          <button
            type="button"
            className="button button--primary"
            disabled={!selected}
            onClick={() => selected && onChoose(selected)}
          >
            {m.bestiary.base.next}
          </button>
        </>
      }
    >
      <div className="base-monster-picker">
        {monsters.length === 0 ? (
          <p className="notice">{m.bestiary.base.emptyBestiary}</p>
        ) : (
          <div className="field">
            <span className="field__label">{m.bestiary.base.monsterLabel}</span>
            <Select
              ariaLabel={m.bestiary.base.monsterAria}
              value={selectedId}
              searchable
              placeholder={m.bestiary.base.searchPlaceholder}
              options={monsters.map((monster) => ({
                value: monster.id,
                label: fill(m.bestiary.base.option, {
                  name: monster.name,
                  cr: formatChallengeRating(monster.challengeRating),
                  realm: realmNames.get(monster.realmId) ?? m.bestiary.saved.noRealm
                })
              }))}
              onChange={setSelectedId}
            />
          </div>
        )}

        {selected ? (
          <p className="base-monster-picker__hint">
            {fill(m.bestiary.base.hint, { name: selected.name })}
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
