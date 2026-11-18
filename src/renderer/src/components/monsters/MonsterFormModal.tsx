import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, JSX } from 'react'
import type { Monster, MonsterAbility, MonsterInput } from '@shared/monster'
import type { Realm } from '@shared/realm'
import { createMonsterAbility, formatChallengeRating } from '@shared/domain'
import { errorMessage } from '@renderer/lib/api'
import { useI18n } from '@renderer/i18n/LocaleProvider'
import { MONSTER_STAT_FIELDS } from '@renderer/lib/monsterStats'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { StatusField } from '../ui/StatusField'
import { IconPlus, IconTrash } from '../ui/icons'
import { MonsterStatField } from './MonsterStatField'

type ScoreKey = (typeof MONSTER_STAT_FIELDS)[number]['key']
type ScoreDraft = Record<ScoreKey, string>

interface AbilityDraft {
  id: string
  name: string
  description: string
}

const EMPTY_SCORES = Object.fromEntries(
  MONSTER_STAT_FIELDS.map((field) => [field.key, '10'])
) as ScoreDraft

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

export type MonsterFormSubmission = MonsterInput & {
  statuses?: string[]
  sourceMonsterId?: string | null
}

interface MonsterFormModalProps {
  open: boolean
  title: string
  description?: string
  initial: MonsterFormValues | null
  /** Если задано, в форме появляется выбор сеттинга. */
  realms?: readonly Realm[]
  /** Сеттинг уже известен (редактирование или наследство) — выбор заблокирован. */
  lockRealm?: boolean
  /** Монстры бестиария для необязательного заполнения формы по основе. */
  baseMonsters?: readonly Monster[]
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
  baseMonsters,
  allowZeroHitPoints = false,
  showStatuses = false,
  onClose,
  onSubmit
}: MonsterFormModalProps): JSX.Element {
  const { messages: m, fill } = useI18n()
  const minHitPoints = allowZeroHitPoints ? 0 : 1
  const [name, setName] = useState('')
  const [realmId, setRealmId] = useState('')
  const [baseMonsterId, setBaseMonsterId] = useState('')
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
  const realmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    setName(initial?.name ?? '')
    setRealmId(initial?.realmId ?? '')
    setBaseMonsterId('')
    setScores(
      initial
        ? (Object.fromEntries(
            MONSTER_STAT_FIELDS.map((field) => [field.key, String(initial[field.key])])
          ) as ScoreDraft)
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

  function changeRealm(value: string): void {
    setRealmId(value)
    setBaseMonsterId('')
  }

  function applyBaseMonster(id: string): void {
    const monster = baseMonsters?.find((item) => item.id === id)
    setBaseMonsterId(monster?.id ?? '')

    if (!monster) return

    setName(monster.name)
    setScores(
      Object.fromEntries(
        MONSTER_STAT_FIELDS.map((field) => [field.key, String(monster[field.key])])
      ) as ScoreDraft
    )
    setChallengeRating(String(monster.challengeRating))
    setArmorClass(String(monster.armorClass))
    setHitPoints(String(monster.hitPoints))
    setAbilities(monster.abilities.map((ability) => ({ ...ability })))
    setJustAddedId(null)
    setError(null)
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

  const showBasePicker = Boolean(baseMonsters && baseMonsters.length > 0)
  /** Новое уникальное существо начинается с выбора сеттинга. */
  const focusRealm = Boolean(baseMonsters) && !initial && !lockRealm
  const baseOptions = realmId
    ? (baseMonsters ?? []).filter((monster) => monster.realmId === realmId)
    : []
  const baseHint =
    realmId && baseOptions.length === 0
      ? m.bestiary.form.baseMonsterEmpty
      : m.bestiary.form.baseMonsterHint

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (saving) return

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError(m.bestiary.form.nameRequired)
      nameRef.current?.focus()
      return
    }

    const filledAbilities = abilities.filter(
      (ability) => ability.name.trim() || ability.description.trim()
    )

    if (filledAbilities.some((ability) => !ability.name.trim())) {
      setError(m.bestiary.form.abilityNameRequired)
      return
    }

    if (realms && !realmId) {
      setError(m.bestiary.form.realmRequired)
      return
    }

    const scoreValues = Object.fromEntries(
      MONSTER_STAT_FIELDS.map((field) => [
        field.key,
        clampNumber(parseIntOr(scores[field.key], 10), 1, 30, 10)
      ])
    ) as Record<ScoreKey, number>

    const input: MonsterFormSubmission = {
      name: trimmedName,
      ...scoreValues,
      challengeRating: clampNumber(parseFloatOr(challengeRating, 1), 0, 30, 1),
      armorClass: clampNumber(parseIntOr(armorClass, 10), 0, 99, 10),
      hitPoints: clampNumber(parseIntOr(hitPoints, 10), minHitPoints, 100_000, 10),
      abilities: filledAbilities.map((ability) => ({
        id: ability.id,
        name: ability.name.trim(),
        description: ability.description.trim()
      })),
      ...(showStatuses ? { statuses } : {}),
      ...(baseMonsters ? { sourceMonsterId: baseMonsterId || null } : {})
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
      initialFocusRef={focusRealm ? realmRef : nameRef}
      footer={
        <>
          <button type="button" className="button" onClick={onClose} disabled={saving}>
            {m.bestiary.form.cancel}
          </button>
          <button
            type="submit"
            form={formId}
            className="button button--primary"
            disabled={saving || (Boolean(realms) && !realmId)}
          >
            {saving ? m.bestiary.form.saving : m.bestiary.form.save}
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
          <div
            className={`monster-form__realm${
              showBasePicker ? ' monster-form__realm--with-base' : ''
            }`}
          >
            <div className="field">
              <span className="field__label">{m.bestiary.form.realmLabel}</span>
              <Select
                ariaLabel={m.bestiary.form.realmAria}
                value={realmId}
                placeholder={m.bestiary.form.realmPlaceholder}
                disabled={lockRealm}
                controlRef={realmRef}
                options={realms.map((realm) => ({ value: realm.id, label: realm.name }))}
                onChange={changeRealm}
              />
              <span className="game-editor__hint">
                {lockRealm ? m.bestiary.form.realmHintLocked : m.bestiary.form.realmHint}
              </span>
            </div>

            {showBasePicker ? (
              <div className="field">
                <span className="field__label">{m.bestiary.form.baseMonsterLabel}</span>
                <Select
                  ariaLabel={m.bestiary.form.baseMonsterAria}
                  value={baseMonsterId}
                  placeholder={m.bestiary.form.baseMonsterPlaceholder}
                  disabled={!realmId || baseOptions.length === 0}
                  searchable
                  options={[
                    { value: '', label: m.bestiary.form.baseMonsterPlaceholder },
                    ...baseOptions.map((monster) => ({
                      value: monster.id,
                      label: fill(m.bestiary.form.baseMonsterOption, {
                        name: monster.name,
                        cr: formatChallengeRating(monster.challengeRating)
                      })
                    }))
                  ]}
                  onChange={applyBaseMonster}
                />
                <span className="game-editor__hint">{baseHint}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        <label className="field">
          <span className="field__label">{m.bestiary.form.nameLabel}</span>
          <input
            ref={nameRef}
            className="input"
            value={name}
            maxLength={100}
            placeholder={m.bestiary.form.namePlaceholder}
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <div className="monster-form__scores">
          {MONSTER_STAT_FIELDS.map((field) => (
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

        <p className="game-editor__hint">{m.bestiary.form.scoresHint}</p>

        <div className="monster-form__vitals">
          <label className="field">
            <span className="field__label">{m.bestiary.form.challengeRatingLabel}</span>
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
            <span className="field__label">{m.bestiary.form.armorClassLabel}</span>
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
            <span className="field__label">{m.bestiary.form.hitPointsLabel}</span>
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
          <span className="field__label">{m.bestiary.form.abilitiesLabel}</span>

          <div className="abilities-editor">
            {abilities.length === 0 ? (
              <p className="abilities-editor__empty">{m.bestiary.form.abilitiesEmpty}</p>
            ) : null}

            {abilities.map((ability) => (
              <div className="ability-row" key={ability.id}>
                <div className="ability-row__top">
                  <input
                    className="input"
                    value={ability.name}
                    maxLength={80}
                    placeholder={m.bestiary.form.abilityNamePlaceholder}
                    autoFocus={ability.id === justAddedId}
                    onChange={(event) => updateAbility(ability.id, { name: event.target.value })}
                  />
                  <button
                    type="button"
                    className="icon-button icon-button--danger"
                    title={m.bestiary.form.removeAbility}
                    aria-label={m.bestiary.form.removeAbility}
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
                  placeholder={m.bestiary.form.abilityDescriptionPlaceholder}
                  onChange={(event) =>
                    updateAbility(ability.id, { description: event.target.value })
                  }
                />
              </div>
            ))}

            <button type="button" className="button button--dashed" onClick={addAbility}>
              <IconPlus width={16} height={16} />
              {m.bestiary.form.addAbility}
            </button>
          </div>
        </div>

        {showStatuses ? <StatusField value={statuses} onChange={setStatuses} /> : null}

        {error ? <p className="notice notice--error">{error}</p> : null}
      </form>
    </Modal>
  )
}
