import { useState } from 'react'
import type { FormEvent, JSX } from 'react'
import type { Campaign, Character, CharacterKind } from '@shared/campaign'
import { characterKindLabels, combatantFromCharacter, createCharacter } from '@shared/domain'
import { toIntOrNull } from '@renderer/lib/format'

interface PartyRosterProps {
  campaign: Campaign
  update: (mutator: (draft: Campaign) => Campaign) => void
}

const KIND_OPTIONS: CharacterKind[] = ['pc', 'npc', 'monster']

export function PartyRoster({ campaign, update }: PartyRosterProps): JSX.Element {
  const [form, setForm] = useState({
    name: '',
    subtitle: '',
    kind: 'pc' as CharacterKind,
    bonus: '0',
    armorClass: '',
    maxHp: ''
  })

  function patchCharacter(characterId: string, patch: Partial<Omit<Character, 'id'>>): void {
    update((draft) => ({
      ...draft,
      characters: draft.characters.map((character) =>
        character.id === characterId ? { ...character, ...patch } : character
      )
    }))
  }

  function handleAdd(event: FormEvent): void {
    event.preventDefault()
    const trimmed = form.name.trim()
    if (!trimmed) return

    update((draft) => ({
      ...draft,
      characters: [
        ...draft.characters,
        createCharacter({
          name: trimmed,
          subtitle: form.subtitle.trim(),
          kind: form.kind,
          initiativeBonus: toIntOrNull(form.bonus) ?? 0,
          armorClass: toIntOrNull(form.armorClass),
          maxHp: toIntOrNull(form.maxHp)
        })
      ]
    }))

    setForm({ name: '', subtitle: '', kind: 'pc', bonus: '0', armorClass: '', maxHp: '' })
  }

  function removeCharacter(character: Character): void {
    const confirmed = window.confirm(`Удалить «${character.name}» из группы?`)
    if (!confirmed) return

    update((draft) => ({
      ...draft,
      characters: draft.characters.filter((c) => c.id !== character.id)
    }))
  }

  function addToEncounter(character: Character): void {
    update((draft) => {
      // Повторный клик (или двойной клик) не должен добавлять дубликата в бой.
      if (draft.encounter.combatants.some((c) => c.characterId === character.id)) {
        return draft
      }

      return {
        ...draft,
        encounter: {
          ...draft.encounter,
          combatants: [...draft.encounter.combatants, combatantFromCharacter(character)]
        }
      }
    })
  }

  function isInEncounter(character: Character): boolean {
    return campaign.encounter.combatants.some((c) => c.characterId === character.id)
  }

  return (
    <div className="roster">
      <form className="roster-form" onSubmit={handleAdd}>
        <label className="field">
          <span className="field__label">Имя</span>
          <input
            className="input"
            placeholder="Ария Среброкрылая"
            aria-label="Имя персонажа"
            value={form.name}
            maxLength={60}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label className="field">
          <span className="field__label">Класс / тип</span>
          <input
            className="input"
            placeholder="Плут 5 · или «гоблин»"
            aria-label="Класс или тип"
            value={form.subtitle}
            maxLength={60}
            onChange={(event) => setForm({ ...form, subtitle: event.target.value })}
          />
        </label>
        <label className="field">
          <span className="field__label">Тип</span>
          <select
            className="select"
            aria-label="Тип персонажа"
            value={form.kind}
            onChange={(event) => setForm({ ...form, kind: event.target.value as CharacterKind })}
          >
            {KIND_OPTIONS.map((kind) => (
              <option key={kind} value={kind}>
                {characterKindLabels[kind]}
              </option>
            ))}
          </select>
        </label>
        <label className="field field--narrow">
          <span className="field__label">Иниц.</span>
          <input
            className="input input--num"
            type="number"
            aria-label="Бонус инициативы"
            value={form.bonus}
            onChange={(event) => setForm({ ...form, bonus: event.target.value })}
          />
        </label>
        <label className="field field--narrow">
          <span className="field__label">КД</span>
          <input
            className="input input--num"
            type="number"
            placeholder="—"
            aria-label="Класс доспеха"
            value={form.armorClass}
            onChange={(event) => setForm({ ...form, armorClass: event.target.value })}
          />
        </label>
        <label className="field field--narrow">
          <span className="field__label">Хиты</span>
          <input
            className="input input--num"
            type="number"
            placeholder="—"
            aria-label="Максимум хитов"
            value={form.maxHp}
            onChange={(event) => setForm({ ...form, maxHp: event.target.value })}
          />
        </label>
        <button className="button button--primary" type="submit" disabled={!form.name.trim()}>
          Добавить
        </button>
      </form>

      {campaign.characters.length === 0 ? (
        <div className="empty">
          <p>Группа пуста. Добавьте персонажей игроков и важных NPC — их можно в один клик отправить в бой.</p>
        </div>
      ) : (
        <ul className="roster-list">
          {campaign.characters.map((character) => (
            <li key={character.id} className={`roster-row roster-row--${character.kind}`}>
              <div className="roster-row__identity">
                <input
                  className="inline-input roster-row__name"
                  value={character.name}
                  placeholder="Без имени"
                  aria-label="Имя персонажа"
                  onChange={(event) => patchCharacter(character.id, { name: event.target.value })}
                />
                <input
                  className="inline-input roster-row__subtitle"
                  value={character.subtitle}
                  placeholder="класс / тип"
                  aria-label="Класс или тип"
                  onChange={(event) => patchCharacter(character.id, { subtitle: event.target.value })}
                />
                <span className={`tag tag--kind tag--${character.kind}`}>
                  {characterKindLabels[character.kind]}
                </span>
              </div>

              <label className="mini-field">
                <span>Иниц.</span>
                <input
                  className="input input--num"
                  type="number"
                  value={character.initiativeBonus}
                  onChange={(event) =>
                    patchCharacter(character.id, {
                      initiativeBonus: toIntOrNull(event.target.value) ?? 0
                    })
                  }
                />
              </label>

              <label className="mini-field">
                <span>КД</span>
                <input
                  className="input input--num"
                  type="number"
                  placeholder="—"
                  value={character.armorClass ?? ''}
                  onChange={(event) =>
                    patchCharacter(character.id, { armorClass: toIntOrNull(event.target.value) })
                  }
                />
              </label>

              <label className="mini-field">
                <span>Хиты</span>
                <input
                  className="input input--num"
                  type="number"
                  placeholder="—"
                  value={character.maxHp ?? ''}
                  onChange={(event) =>
                    patchCharacter(character.id, { maxHp: toIntOrNull(event.target.value) })
                  }
                />
              </label>

              <div className="roster-row__actions">
                <button
                  className="button button--tiny"
                  disabled={isInEncounter(character)}
                  onClick={() => addToEncounter(character)}
                >
                  {isInEncounter(character) ? 'В бою' : 'В бой'}
                </button>
                <button
                  className="button button--tiny button--danger"
                  onClick={() => removeCharacter(character)}
                >
                  Удалить
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
