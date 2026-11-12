import { useState } from 'react'
import type { FormEvent, JSX } from 'react'
import type { Campaign, Combatant, Encounter } from '@shared/campaign'
import { createCombatant } from '@shared/domain'
import {
  advanceTurn,
  clampHp,
  CONDITIONS,
  rewindTurn,
  rollInitiative,
  sortCombatants,
  stopEncounter,
  updateCombatant
} from '@shared/initiative'
import { signed, toIntOrNull } from '@renderer/lib/format'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { Select } from './ui/Select'

interface InitiativeBoardProps {
  campaign: Campaign
  update: (mutator: (draft: Campaign) => Campaign) => void
}

export function InitiativeBoard({ campaign, update }: InitiativeBoardProps): JSX.Element {
  const encounter = campaign.encounter
  const order = sortCombatants(encounter.combatants)
  const running = encounter.status === 'running'

  const [name, setName] = useState('')
  const [bonus, setBonus] = useState('0')
  const [initiative, setInitiative] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  const patchEncounter = (mutator: (current: Encounter) => Encounter): void => {
    update((draft) => ({ ...draft, encounter: mutator(draft.encounter) }))
  }

  function handleAdd(event: FormEvent): void {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    patchEncounter((current) => ({
      ...current,
      combatants: [
        ...current.combatants,
        createCombatant({
          name: trimmed,
          initiativeBonus: toIntOrNull(bonus) ?? 0,
          initiative: initiative.trim() === '' ? null : toIntOrNull(initiative)
        })
      ]
    }))

    setName('')
    setInitiative('')
  }

  function rollMissing(): void {
    patchEncounter((current) => ({
      ...current,
      combatants: current.combatants.map((combatant) =>
        combatant.initiative === null
          ? { ...combatant, initiative: rollInitiative(combatant.initiativeBonus) }
          : combatant
      )
    }))
  }

  function clearEncounter(): void {
    patchEncounter((current) => ({ ...stopEncounter(current), combatants: [] }))
    setConfirmClear(false)
  }

  return (
    <div className="board">
      <div className="board__toolbar">
        <div className="round">
          <span className="round__label">{running ? 'Раунд' : 'Бой не начат'}</span>
          {running ? <span className="round__value">{encounter.round}</span> : null}
        </div>

        <div className="board__actions">
          <button className="button button--primary" onClick={() => patchEncounter(advanceTurn)}>
            {running ? 'Следующий ход →' : 'Начать бой'}
          </button>
          <button
            className="button"
            onClick={() => patchEncounter(rewindTurn)}
            disabled={order.length === 0}
            title="Вернуть предыдущий ход"
          >
            ←
          </button>
          <button
            className="button"
            onClick={rollMissing}
            disabled={!order.some((c) => c.initiative === null)}
          >
            Бросить инициативу
          </button>
          {running ? (
            <button className="button" onClick={() => patchEncounter(stopEncounter)}>
              Завершить
            </button>
          ) : null}
          <button
            className="button button--danger"
            onClick={() => setConfirmClear(true)}
            disabled={order.length === 0}
          >
            Очистить
          </button>
        </div>
      </div>

      <form className="add-row" onSubmit={handleAdd}>
        <input
          className="input"
          placeholder="Имя участника"
          aria-label="Имя участника"
          value={name}
          maxLength={60}
          onChange={(event) => setName(event.target.value)}
        />
        <label className="mini-field">
          <span>Бонус</span>
          <input
            className="input input--num"
            type="number"
            aria-label="Бонус инициативы"
            value={bonus}
            onChange={(event) => setBonus(event.target.value)}
          />
        </label>
        <label className="mini-field">
          <span>Инициатива</span>
          <input
            className="input input--num"
            type="number"
            placeholder="d20"
            aria-label="Инициатива"
            value={initiative}
            onChange={(event) => setInitiative(event.target.value)}
          />
        </label>
        <button className="button" type="submit" disabled={!name.trim()}>
          Добавить
        </button>
      </form>

      {order.length === 0 ? (
        <div className="empty">
          <p>Добавьте участников вручную или перенесите их из вкладки «Группа».</p>
        </div>
      ) : (
        <ol className="init-list">
          {order.map((combatant, index) => (
            <InitiativeRow
              key={combatant.id}
              combatant={combatant}
              position={index + 1}
              active={combatant.id === encounter.activeId}
              onChange={(patch) =>
                patchEncounter((current) => updateCombatant(current, combatant.id, patch))
              }
              onRemove={() =>
                patchEncounter((current) => ({
                  ...current,
                  combatants: current.combatants.filter((c) => c.id !== combatant.id),
                  activeId: current.activeId === combatant.id ? null : current.activeId
                }))
              }
            />
          ))}
        </ol>
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Очистить список боя?"
        description="Участники будут убраны из боя, персонажи в группе останутся."
        confirmLabel="Очистить"
        onCancel={() => setConfirmClear(false)}
        onConfirm={clearEncounter}
      />
    </div>
  )
}

interface InitiativeRowProps {
  combatant: Combatant
  position: number
  active: boolean
  onChange: (patch: Partial<Omit<Combatant, 'id'>>) => void
  onRemove: () => void
}

function InitiativeRow({
  combatant,
  position,
  active,
  onChange,
  onRemove
}: InitiativeRowProps): JSX.Element {
  function addCondition(value: string): void {
    if (!value || combatant.conditions.includes(value)) return
    onChange({ conditions: [...combatant.conditions, value] })
  }

  function removeCondition(value: string): void {
    onChange({ conditions: combatant.conditions.filter((condition) => condition !== value) })
  }

  const adjustHp = (delta: number): void => {
    onChange({ hpCurrent: clampHp(combatant, delta).hpCurrent })
  }

  return (
    <li className={`init-row${active ? ' init-row--active' : ''}`}>
      <div className="init-row__main">
        <span className="init-row__pos">{position}</span>
        <input
          className="input input--num input--init"
          type="number"
          value={combatant.initiative ?? ''}
          placeholder="—"
          aria-label={`Инициатива: ${combatant.name}`}
          onChange={(event) => onChange({ initiative: toIntOrNull(event.target.value) })}
        />
        <div className="init-row__who">
          <input
            className="inline-input init-row__name"
            value={combatant.name}
            placeholder="Без имени"
            aria-label="Имя участника"
            onChange={(event) => onChange({ name: event.target.value })}
          />
          <span className="init-row__tags">
            {combatant.isPlayer ? <span className="tag tag--player">игрок</span> : null}
            <span className="tag">бонус {signed(combatant.initiativeBonus)}</span>
            {active ? <span className="tag tag--active">сейчас ходит</span> : null}
          </span>
        </div>
      </div>

      <div className="init-row__stats">
        <label className="mini-field">
          <span>КД</span>
          <input
            className="input input--num"
            type="number"
            value={combatant.armorClass ?? ''}
            placeholder="—"
            onChange={(event) => onChange({ armorClass: toIntOrNull(event.target.value) })}
          />
        </label>

        <div className="hp">
          <button className="hp__btn" onClick={() => adjustHp(-5)} title="Урон 5" type="button">
            −5
          </button>
          <button className="hp__btn" onClick={() => adjustHp(-1)} title="Урон 1" type="button">
            −1
          </button>
          <input
            className="input input--num hp__value"
            type="number"
            value={combatant.hpCurrent ?? ''}
            placeholder="—"
            aria-label="Текущие хиты"
            onChange={(event) => onChange({ hpCurrent: toIntOrNull(event.target.value) })}
          />
          <span className="hp__slash">/</span>
          <input
            className="input input--num hp__value"
            type="number"
            value={combatant.hpMax ?? ''}
            placeholder="—"
            aria-label="Максимум хитов"
            onChange={(event) => onChange({ hpMax: toIntOrNull(event.target.value) })}
          />
          <button className="hp__btn" onClick={() => adjustHp(1)} title="Лечение 1" type="button">
            +1
          </button>
          <button className="hp__btn" onClick={() => adjustHp(5)} title="Лечение 5" type="button">
            +5
          </button>
        </div>
      </div>

      <div className="init-row__conditions">
        {combatant.conditions.map((condition) => (
          <button
            key={condition}
            className="chip chip--condition"
            onClick={() => removeCondition(condition)}
            title="Убрать состояние"
          >
            {condition} ×
          </button>
        ))}
        <Select
          ariaLabel="Добавить состояние"
          value=""
          placeholder="+ состояние"
          variant="chip"
          options={CONDITIONS.filter((condition) => !combatant.conditions.includes(condition)).map(
            (condition) => ({ value: condition, label: condition })
          )}
          onChange={addCondition}
        />
      </div>

      <button className="icon-button icon-button--danger" onClick={onRemove} title="Убрать из боя">
        ×
      </button>
    </li>
  )
}
