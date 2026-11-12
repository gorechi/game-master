import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, JSX } from 'react'
import type { Monster, MonsterInput } from '@shared/monster'
import { createMonsterAbility } from '@shared/domain'
import { api, errorMessage } from '@renderer/lib/api'
import { Modal } from '../ui/Modal'
import { IconPlus, IconTrash } from '../ui/icons'

const SCORE_FIELDS = [
  { key: 'strength', label: 'Сила', short: 'СИЛ' },
  { key: 'dexterity', label: 'Ловкость', short: 'ЛОВ' },
  { key: 'intelligence', label: 'Интеллект', short: 'ИНТ' },
  { key: 'wisdom', label: 'Мудрость', short: 'МДР' },
  { key: 'constitution', label: 'Телосложение', short: 'ТЕЛ' },
  { key: 'charisma', label: 'Харизма', short: 'ХАР' }
] as const

type ScoreKey = (typeof SCORE_FIELDS)[number]['key']
type ScoreDraft = Record<ScoreKey, string>

interface AbilityDraft {
  id: string
  name: string
  description: string
}

const EMPTY_SCORES: ScoreDraft = {
  strength: '0',
  dexterity: '0',
  intelligence: '0',
  wisdom: '0',
  constitution: '0',
  charisma: '0'
}

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

function parseIntOr(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseFloatOr(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : fallback
}

interface MonsterFormModalProps {
  open: boolean
  monster: Monster | null
  onClose: () => void
  onSaved: (monster: Monster) => void
}

export function MonsterFormModal({
  open,
  monster,
  onClose,
  onSaved
}: MonsterFormModalProps): JSX.Element {
  const [name, setName] = useState('')
  const [scores, setScores] = useState<ScoreDraft>(EMPTY_SCORES)
  const [challengeRating, setChallengeRating] = useState('1')
  const [armorClass, setArmorClass] = useState('10')
  const [hitPoints, setHitPoints] = useState('10')
  const [abilities, setAbilities] = useState<AbilityDraft[]>([])
  const [justAddedId, setJustAddedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const formId = useId()
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return

    setName(monster?.name ?? '')
    setScores(
      monster
        ? {
            strength: String(monster.strength),
            dexterity: String(monster.dexterity),
            intelligence: String(monster.intelligence),
            wisdom: String(monster.wisdom),
            constitution: String(monster.constitution),
            charisma: String(monster.charisma)
          }
        : EMPTY_SCORES
    )
    setChallengeRating(monster ? String(monster.challengeRating) : '1')
    setArmorClass(monster ? String(monster.armorClass) : '10')
    setHitPoints(monster ? String(monster.hitPoints) : '10')
    setAbilities(
      monster
        ? monster.abilities.map((ability) => ({ ...ability }))
        : [createMonsterAbility()]
    )
    setJustAddedId(null)
    setError(null)
    setSaving(false)
  }, [open, monster])

  function setScore(key: ScoreKey, value: string): void {
    setScores((current) => ({ ...current, [key]: value }))
  }

  function addAbility(): void {
    const ability = createMonsterAbility()
    setAbilities((current) => [...current, ability])
    setJustAddedId(ability.id)
  }

  function updateAbility(id: string, patch: Partial<AbilityDraft>): void {
    setAbilities((current) =>
      current.map((ability) => (ability.id === id ? { ...ability, ...patch } : ability))
    )
  }

  function removeAbility(id: string): void {
    setAbilities((current) => current.filter((ability) => ability.id !== id))
    setJustAddedId((current) => (current === id ? null : current))
  }

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (saving) return

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Укажите название монстра')
      nameRef.current?.focus()
      return
    }

    const filledAbilities = abilities.filter(
      (ability) => ability.name.trim() || ability.description.trim()
    )

    if (filledAbilities.some((ability) => !ability.name.trim())) {
      setError('Укажите название для каждой способности')
      return
    }

    const input: MonsterInput = {
      name: trimmedName,
      strength: clampNumber(parseIntOr(scores.strength, 0), -10, 10, 0),
      dexterity: clampNumber(parseIntOr(scores.dexterity, 0), -10, 10, 0),
      intelligence: clampNumber(parseIntOr(scores.intelligence, 0), -10, 10, 0),
      wisdom: clampNumber(parseIntOr(scores.wisdom, 0), -10, 10, 0),
      constitution: clampNumber(parseIntOr(scores.constitution, 0), -10, 10, 0),
      charisma: clampNumber(parseIntOr(scores.charisma, 0), -10, 10, 0),
      challengeRating: clampNumber(parseFloatOr(challengeRating, 1), 0, 30, 1),
      armorClass: clampNumber(parseIntOr(armorClass, 10), 0, 99, 10),
      hitPoints: clampNumber(parseIntOr(hitPoints, 10), 1, 100_000, 10),
      abilities: filledAbilities.map((ability) => ({
        id: ability.id,
        name: ability.name.trim(),
        description: ability.description.trim()
      }))
    }

    setSaving(true)
    setError(null)

    try {
      const saved = monster
        ? await api.monsters.update({ ...monster, ...input })
        : await api.monsters.create(input)
      onSaved(saved)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={monster ? 'Редактировать монстра' : 'Новый монстр'}
      description="Характеристики, классы и способности. Способности можно добавлять и удалять."
      size="lg"
      onClose={onClose}
      initialFocusRef={nameRef}
      footer={
        <>
          <button type="button" className="button" onClick={onClose} disabled={saving}>
            Отмена
          </button>
          <button type="submit" form={formId} className="button button--primary" disabled={saving}>
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </>
      }
    >
      <form
        id={formId}
        className="monster-form"
        noValidate
        onSubmit={(event) => void submit(event)}
      >
        <label className="field">
          <span className="field__label">Название</span>
          <input
            ref={nameRef}
            className="input"
            value={name}
            maxLength={100}
            placeholder="Скелет-стражник"
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <div className="monster-form__scores">
          {SCORE_FIELDS.map((field) => (
            <label className="field monster-form__score" key={field.key} title={field.label}>
              <span className="field__label">{field.short}</span>
              <input
                className="input"
                type="number"
                inputMode="numeric"
                min={-10}
                max={10}
                value={scores[field.key]}
                onChange={(event) => setScore(field.key, event.target.value)}
                onBlur={(event) =>
                  setScore(
                    field.key,
                    String(clampNumber(parseIntOr(event.target.value, 0), -10, 10, 0))
                  )
                }
              />
            </label>
          ))}
        </div>

        <div className="monster-form__vitals">
          <label className="field">
            <span className="field__label">Класс опасности</span>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              min={0}
              max={30}
              step={0.125}
              value={challengeRating}
              onChange={(event) => setChallengeRating(event.target.value)}
              onBlur={(event) =>
                setChallengeRating(
                  String(clampNumber(parseFloatOr(event.target.value, 1), 0, 30, 1))
                )
              }
            />
          </label>

          <label className="field">
            <span className="field__label">Класс защиты</span>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              value={armorClass}
              onChange={(event) => setArmorClass(event.target.value)}
              onBlur={(event) =>
                setArmorClass(
                  String(clampNumber(parseIntOr(event.target.value, 10), 0, 99, 10))
                )
              }
            />
          </label>

          <label className="field">
            <span className="field__label">Здоровье</span>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min={1}
              max={100000}
              value={hitPoints}
              onChange={(event) => setHitPoints(event.target.value)}
              onBlur={(event) =>
                setHitPoints(
                  String(clampNumber(parseIntOr(event.target.value, 10), 1, 100_000, 10))
                )
              }
            />
          </label>
        </div>

        <div className="field">
          <span className="field__label">Способности</span>

          <div className="abilities-editor">
            {abilities.length === 0 ? (
              <p className="abilities-editor__empty">
                Пока ни одной способности. Добавьте первую — каждая способность это отдельное поле.
              </p>
            ) : null}

            {abilities.map((ability) => (
              <div className="ability-row" key={ability.id}>
                <div className="ability-row__top">
                  <input
                    className="input"
                    value={ability.name}
                    maxLength={80}
                    placeholder="Название способности"
                    autoFocus={ability.id === justAddedId}
                    onChange={(event) => updateAbility(ability.id, { name: event.target.value })}
                  />
                  <button
                    type="button"
                    className="icon-button icon-button--danger"
                    title="Удалить способность"
                    aria-label="Удалить способность"
                    onClick={() => removeAbility(ability.id)}
                  >
                    <IconTrash />
                  </button>
                </div>

                <textarea
                  className="input ability-row__description"
                  value={ability.description}
                  maxLength={2000}
                  rows={2}
                  placeholder="Что делает способность"
                  onChange={(event) =>
                    updateAbility(ability.id, { description: event.target.value })
                  }
                />
              </div>
            ))}

            <button type="button" className="button button--dashed" onClick={addAbility}>
              <IconPlus width={16} height={16} />
              Добавить способность
            </button>
          </div>
        </div>

        {error ? <p className="notice notice--error">{error}</p> : null}
      </form>
    </Modal>
  )
}
