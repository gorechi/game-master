import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, JSX } from 'react'
import type { MonsterAbility, MonsterInput } from '@shared/monster'
import type { Realm } from '@shared/realm'
import { createMonsterAbility } from '@shared/domain'
import { errorMessage } from '@renderer/lib/api'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { StatusField } from '../ui/StatusField'
import { IconPlus, IconTrash } from '../ui/icons'
import { MonsterStatField } from './MonsterStatField'

const SCORE_FIELDS = [
  { key: 'strength', label: 'Сила', short: 'СИЛ' },
  { key: 'dexterity', label: 'Ловкость', short: 'ЛОВ' },
  { key: 'constitution', label: 'Телосложение', short: 'ТЕЛ' },
  { key: 'intelligence', label: 'Интеллект', short: 'ИНТ' },
  { key: 'wisdom', label: 'Мудрость', short: 'МДР' },
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
  strength: '10',
  dexterity: '10',
  intelligence: '10',
  wisdom: '10',
  constitution: '10',
  charisma: '10'
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

export interface MonsterFormValues {
  realmId?: string
  name: string
  strength: number
  dexterity: number
  intelligence: number
  wisdom: number
  constitution: number
  charisma: number
  challengeRating: number
  armorClass: number
  hitPoints: number
  abilities: MonsterAbility[]
  statuses?: string[]
}

export type MonsterFormSubmission = MonsterInput & { statuses?: string[] }

interface MonsterFormModalProps {
  open: boolean
  title: string
  description?: string
  initial: MonsterFormValues | null
  /** Если задано, в форме появляется выбор сеттинга. */
  realms?: readonly Realm[]
  /** Сеттинг уже известен (редактирование или наследство) — выбор заблокирован. */
  lockRealm?: boolean
  /** Для игровых экземпляров: HP может опуститься до нуля. */
  allowZeroHitPoints?: boolean
  /** Показывать редактор статусов (уникальные существа и экземпляры в игре). */
  showStatuses?: boolean
  onClose: () => void
  onSubmit: (input: MonsterFormSubmission, realmId: string | null) => Promise<void> | void
}

export function MonsterFormModal({
  open,
  title,
  description,
  initial,
  realms,
  lockRealm = false,
  allowZeroHitPoints = false,
  showStatuses = false,
  onClose,
  onSubmit
}: MonsterFormModalProps): JSX.Element {
  const minHitPoints = allowZeroHitPoints ? 0 : 1
  const [name, setName] = useState('')
  const [realmId, setRealmId] = useState('')
  const [scores, setScores] = useState<ScoreDraft>(EMPTY_SCORES)
  const [challengeRating, setChallengeRating] = useState('1')
  const [armorClass, setArmorClass] = useState('10')
  const [hitPoints, setHitPoints] = useState('10')
  const [abilities, setAbilities] = useState<AbilityDraft[]>([])
  const [statuses, setStatuses] = useState<string[]>([])
  const [justAddedId, setJustAddedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const formId = useId()
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return

    setName(initial?.name ?? '')
    setRealmId(initial?.realmId ?? '')
    setScores(
      initial
        ? {
            strength: String(initial.strength),
            dexterity: String(initial.dexterity),
            intelligence: String(initial.intelligence),
            wisdom: String(initial.wisdom),
            constitution: String(initial.constitution),
            charisma: String(initial.charisma)
          }
        : EMPTY_SCORES
    )
    setChallengeRating(initial ? String(initial.challengeRating) : '1')
    setArmorClass(initial ? String(initial.armorClass) : '10')
    setHitPoints(initial ? String(initial.hitPoints) : '10')
    setAbilities(
      initial
        ? initial.abilities.map((ability) => ({ ...ability }))
        : [createMonsterAbility()]
    )
    setStatuses(initial?.statuses ?? [])
    setJustAddedId(null)
    setError(null)
    setSaving(false)
  }, [open, initial])

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

    if (realms && !realmId) {
      setError('Выберите сеттинг монстра')
      return
    }

    const input: MonsterFormSubmission = {
      name: trimmedName,
      strength: clampNumber(parseIntOr(scores.strength, 10), 1, 30, 10),
      dexterity: clampNumber(parseIntOr(scores.dexterity, 10), 1, 30, 10),
      intelligence: clampNumber(parseIntOr(scores.intelligence, 10), 1, 30, 10),
      wisdom: clampNumber(parseIntOr(scores.wisdom, 10), 1, 30, 10),
      constitution: clampNumber(parseIntOr(scores.constitution, 10), 1, 30, 10),
      charisma: clampNumber(parseIntOr(scores.charisma, 10), 1, 30, 10),
      challengeRating: clampNumber(parseFloatOr(challengeRating, 1), 0, 30, 1),
      armorClass: clampNumber(parseIntOr(armorClass, 10), 0, 99, 10),
      hitPoints: clampNumber(parseIntOr(hitPoints, 10), minHitPoints, 100_000, 10),
      abilities: filledAbilities.map((ability) => ({
        id: ability.id,
        name: ability.name.trim(),
        description: ability.description.trim()
      })),
      ...(showStatuses ? { statuses } : {})
    }

    setSaving(true)
    setError(null)

    try {
      await onSubmit(input, realms ? realmId || null : null)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      description={description}
      size="lg"
      onClose={onClose}
      initialFocusRef={nameRef}
      footer={
        <>
          <button type="button" className="button" onClick={onClose} disabled={saving}>
            Отмена
          </button>
          <button
            type="submit"
            form={formId}
            className="button button--primary"
            disabled={saving || (Boolean(realms) && !realmId)}
          >
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
        {realms && realms.length > 0 ? (
          <div className="field">
            <span className="field__label">Сеттинг *</span>
            <Select
              ariaLabel="Сеттинг монстра"
              value={realmId}
              placeholder="Выберите сеттинг"
              disabled={lockRealm}
              options={realms.map((realm) => ({ value: realm.id, label: realm.name }))}
              onChange={setRealmId}
            />
            <span className="game-editor__hint">
              {lockRealm
                ? 'Сеттинг задаётся при создании и не меняется.'
                : 'Монстр будет доступен в играх и бестиарии этого сеттинга.'}
            </span>
          </div>
        ) : null}

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
            <MonsterStatField
              key={field.key}
              short={field.short}
              label={field.label}
              value={scores[field.key]}
              onChange={(value) => setScore(field.key, value)}
              onCommit={() =>
                setScore(
                  field.key,
                  String(clampNumber(parseIntOr(scores[field.key], 10), 1, 30, 10))
                )
              }
            />
          ))}
        </div>

        <p className="game-editor__hint">
          Значение характеристики — от 1 до 30. Модификатор считается автоматически.
        </p>

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
              min={minHitPoints}
              max={100000}
              value={hitPoints}
              onChange={(event) => setHitPoints(event.target.value)}
              onBlur={(event) =>
                setHitPoints(
                  String(
                    clampNumber(parseIntOr(event.target.value, 10), minHitPoints, 100_000, 10)
                  )
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

        {showStatuses ? <StatusField value={statuses} onChange={setStatuses} /> : null}

        {error ? <p className="notice notice--error">{error}</p> : null}
      </form>
    </Modal>
  )
}
