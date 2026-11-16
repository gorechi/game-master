import { useEffect, useId, useState } from 'react'
import type { FormEvent, JSX } from 'react'
import type { Game, GameMonster } from '@shared/game'
import type { CharacterProfile } from '@shared/characterProfile'
import type { Player } from '@shared/player'
import { playerFullName } from '@shared/domain'
import { api, errorMessage } from '@renderer/lib/api'
import { useI18n } from '@renderer/i18n/LocaleProvider'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { IconTrash } from '../ui/icons'

export interface CombatResultEntry {
  key: string
  id: string
  kind: 'character' | 'monster'
  name: string
  playerName: string | null
  initiative: number
  tieBreaker: number | null
  character: CharacterProfile | null
  monster: GameMonster | null
}

export interface CombatStart {
  participants: CombatResultEntry[]
  reserves: CombatResultEntry[]
}

interface Combatant {
  key: string
  kind: 'character' | 'monster'
  id: string
  name: string
  playerName: string | null
  participating: boolean
  initiative: string
  tieBreaker: string
  character: CharacterProfile | null
  monster: GameMonster | null
}

interface CombatModalProps {
  open: boolean
  game: Game
  onClose: () => void
  onStart: (start: CombatStart) => void
}

const INITIATIVE_MIN = 1
const INITIATIVE_MAX = 99

function isCharacterDefeated(
  character: CharacterProfile,
  defeatedCharacterIds: readonly string[]
): boolean {
  return defeatedCharacterIds.includes(character.id)
}

function parseInitiative(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return null
  if (parsed < INITIATIVE_MIN || parsed > INITIATIVE_MAX) return null
  return parsed
}

function clampDraft(value: string): string {
  if (!value.trim()) return ''
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return ''
  return String(Math.min(INITIATIVE_MAX, Math.max(INITIATIVE_MIN, Math.round(parsed))))
}

/** Создание схватки: участники, инициатива и разрешение совпадений. */
export function CombatModal({
  open,
  game,
  onClose,
  onStart
}: CombatModalProps): JSX.Element {
  const { messages: m, fill } = useI18n()
  const [characters, setCharacters] = useState<CharacterProfile[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [combatants, setCombatants] = useState<Combatant[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const formId = useId()

  useEffect(() => {
    if (!open) return

    setCombatants([])
    setLoadError(null)
    setLoading(true)

    let cancelled = false

    void Promise.all([api.characters.list(), api.players.list()])
      .then(([allCharacters, allPlayers]) => {
        if (cancelled) return

        const byId = new Map(allCharacters.map((character) => [character.id, character]))
        const gameCharacters = game.characterIds
          .map((id) => byId.get(id))
          .filter((character): character is CharacterProfile => Boolean(character))

        setCharacters(gameCharacters)
        setPlayers(allPlayers)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setLoadError(errorMessage(caught))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, game.id])

  function playerNameOf(playerId: string | null): string | null {
    if (!playerId) return null
    const player = players.find((item) => item.id === playerId)
    return player ? playerFullName(player) : null
  }

  function addCharacter(characterId: string): void {
    const character = characters.find((item) => item.id === characterId)
    if (!character || isCharacterDefeated(character, game.defeatedCharacterIds)) return

    setCombatants((current) => [
      ...current,
      {
        key: `character:${character.id}`,
        kind: 'character',
        id: character.id,
        name: character.name,
        playerName: playerNameOf(character.playerId),
        participating: true,
        initiative: '',
        tieBreaker: '',
        character,
        monster: null
      }
    ])
  }

  function addMonster(monster: GameMonster): void {
    if (game.defeatedMonsterIds.includes(monster.id)) return

    setCombatants((current) => [
      ...current,
      {
        key: `monster:${monster.id}`,
        kind: 'monster',
        id: monster.id,
        name: monster.name,
        playerName: null,
        participating: true,
        initiative: '',
        tieBreaker: '',
        character: null,
        monster
      }
    ])
  }

  function updateCombatant(key: string, patch: Partial<Combatant>): void {
    setCombatants((current) =>
      current.map((combatant) => (combatant.key === key ? { ...combatant, ...patch } : combatant))
    )
  }

  function removeCombatant(key: string): void {
    setCombatants((current) => current.filter((combatant) => combatant.key !== key))
  }

  function normalizeField(key: string, field: 'initiative' | 'tieBreaker'): void {
    setCombatants((current) =>
      current.map((combatant) =>
        combatant.key === key
          ? { ...combatant, [field]: clampDraft(combatant[field]) }
          : combatant
      )
    )
  }

  const participants = combatants.filter((combatant) => combatant.participating)
  const initiativeGroups = new Map<number, Combatant[]>()

  // Инициатива и совпадения считаются по всем добавленным карточкам:
  // снятая галочка не блокирует и не прячет поля.
  for (const combatant of combatants) {
    const initiative = parseInitiative(combatant.initiative)
    if (initiative === null) continue
    const group = initiativeGroups.get(initiative) ?? []
    group.push(combatant)
    initiativeGroups.set(initiative, group)
  }

  const collisionValues = new Set(
    [...initiativeGroups.entries()]
      .filter(([, group]) => group.length > 1)
      .map(([value]) => value)
  )

  function groupFor(combatant: Combatant): Combatant[] | null {
    const initiative = parseInitiative(combatant.initiative)
    if (initiative === null) return null
    const group = initiativeGroups.get(initiative)
    return group && group.length > 1 ? group : null
  }

  function tieValuesAreUnique(group: Combatant[]): boolean {
    const values = group.map((combatant) => parseInitiative(combatant.tieBreaker))
    if (values.some((value) => value === null)) return false
    return new Set(values).size === values.length
  }

  const allInitiativesFilled =
    combatants.length > 0 &&
    combatants.every((combatant) => parseInitiative(combatant.initiative) !== null)
  const allCollisionsResolved = [...collisionValues].every((value) => {
    const group = initiativeGroups.get(value)
    return group
      ? group.every((combatant) => parseInitiative(combatant.tieBreaker) !== null) &&
          tieValuesAreUnique(group)
      : true
  })
  const canFight =
    !loading &&
    !loadError &&
    participants.length > 0 &&
    allInitiativesFilled &&
    allCollisionsResolved

  function toResult(combatant: Combatant): CombatResultEntry | null {
    const initiative = parseInitiative(combatant.initiative)
    if (initiative === null) return null

    const group = groupFor(combatant)
    const tieBreaker = group ? parseInitiative(combatant.tieBreaker) : null

    return {
      key: combatant.key,
      id: combatant.id,
      kind: combatant.kind,
      name: combatant.name,
      playerName: combatant.playerName,
      initiative,
      tieBreaker,
      character: combatant.character,
      monster: combatant.monster
    }
  }

  function submit(event: FormEvent): void {
    event.preventDefault()
    if (!canFight) return

    const queue = participants
      .map(toResult)
      .filter((entry): entry is CombatResultEntry => entry !== null)
    const reserves = combatants
      .filter((combatant) => !combatant.participating)
      .map(toResult)
      .filter((entry): entry is CombatResultEntry => entry !== null)

    onStart({ participants: queue, reserves })
  }

  const addedCharacterIds = new Set(
    combatants.filter((combatant) => combatant.kind === 'character').map((combatant) => combatant.id)
  )
  const addedMonsterIds = new Set(
    combatants.filter((combatant) => combatant.kind === 'monster').map((combatant) => combatant.id)
  )
  const availableCharacters = characters.filter(
    (character) => !isCharacterDefeated(character, game.defeatedCharacterIds)
  )
  const availableMonsters = game.monsters.filter(
    (monster) => !game.defeatedMonsterIds.includes(monster.id)
  )
  const characterOptions = availableCharacters
    .filter((character) => !addedCharacterIds.has(character.id))
    .map((character) => ({
      value: character.id,
      label: character.playerId
        ? fill(m.games.combatSetup.characterOption, {
            name: character.name,
            player: playerNameOf(character.playerId) ?? m.games.combatSetup.noPlayerInline
          })
        : character.name
    }))
  const monsterOptions = availableMonsters
    .filter((monster) => !addedMonsterIds.has(monster.id))
    .map((monster) => ({ value: monster.id, label: monster.name }))

  const hint =
    combatants.length === 0
      ? m.games.combatSetup.hintEmpty
      : participants.length === 0
        ? m.games.combatSetup.hintNoParticipants
        : !allInitiativesFilled
          ? m.games.combatSetup.hintInitiative
          : !allCollisionsResolved
            ? m.games.combatSetup.hintTies
            : null

  function renderCard(combatant: Combatant): JSX.Element {
    const group = groupFor(combatant)
    const duplicateTie =
      group !== null &&
      group.every((item) => parseInitiative(item.tieBreaker) !== null) &&
      !tieValuesAreUnique(group)

    return (
      <li key={combatant.key} className="combat-card">
        <span className="combat-card__identity">
          <span className="combat-card__name">{combatant.name}</span>
          <span className="combat-card__meta">
            {combatant.kind === 'character'
              ? (combatant.playerName ?? m.games.combatSetup.noPlayer)
              : m.games.combatSetup.monsterKind}
          </span>
        </span>

        <label className="combat-participate">
          <input
            type="checkbox"
            className="checkbox"
            checked={combatant.participating}
            onChange={(event) =>
              updateCombatant(combatant.key, { participating: event.target.checked })
            }
          />
          <span>{m.games.combatSetup.participating}</span>
        </label>

        <label className="combat-initiative">
          <span>{m.games.combatSetup.initiative}</span>
          <input
            className="input combat-initiative__input"
            type="number"
            min={INITIATIVE_MIN}
            max={INITIATIVE_MAX}
            inputMode="numeric"
            value={combatant.initiative}
            aria-label={fill(m.games.combatSetup.initiativeAria, {
              name: combatant.name
            })}
            onChange={(event) =>
              updateCombatant(combatant.key, { initiative: event.target.value })
            }
            onBlur={() => normalizeField(combatant.key, 'initiative')}
          />
        </label>

        {group ? (
          <label className="combat-initiative combat-initiative--tie">
            <span>{m.games.combatSetup.tieInitiative}</span>
            <input
              className="input combat-initiative__input"
              type="number"
              min={INITIATIVE_MIN}
              max={INITIATIVE_MAX}
              inputMode="numeric"
              value={combatant.tieBreaker}
              aria-label={fill(m.games.combatSetup.tieInitiativeAria, {
                name: combatant.name
              })}
              onChange={(event) =>
                updateCombatant(combatant.key, { tieBreaker: event.target.value })
              }
              onBlur={() => normalizeField(combatant.key, 'tieBreaker')}
            />
          </label>
        ) : null}

        <button
          type="button"
          className="icon-button icon-button--danger combat-card__remove"
          title={m.games.combatSetup.removeFromList}
          aria-label={fill(m.games.combatSetup.removeAria, { name: combatant.name })}
          onClick={() => removeCombatant(combatant.key)}
        >
          <IconTrash />
        </button>

        {duplicateTie ? (
          <span className="combat-card__warning">
            {m.games.combatSetup.duplicateTie}
          </span>
        ) : null}
      </li>
    )
  }

  return (
    <Modal
      open={open}
      title={m.games.combatSetup.title}
      description={m.games.combatSetup.description}
      size="lg"
      panelClassName="modal--combat"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button" onClick={onClose}>
            {m.games.combatSetup.cancel}
          </button>
          <button
            type="submit"
            form={formId}
            className="button button--primary"
            disabled={!canFight}
            title={hint ?? m.games.combatSetup.startTitle}
          >
            {m.games.combatSetup.fight}
          </button>
        </>
      }
    >
      <form id={formId} className="combat-form" noValidate onSubmit={submit}>
        {loadError ? <p className="notice notice--error">{loadError}</p> : null}

        <section className="combat-section" aria-labelledby="combat-characters">
          <header className="combat-section__head">
            <h3 id="combat-characters">{m.games.combatSetup.charactersTitle}</h3>
            <span className="combat-section__count">
              {fill(m.games.combatSetup.charactersCount, { count: characters.length })}
            </span>
          </header>

          {loading ? (
            <p className="muted">{m.games.combatSetup.charactersLoading}</p>
          ) : characters.length === 0 ? (
            <p className="abilities-editor__empty">{m.games.combatSetup.charactersEmpty}</p>
          ) : characterOptions.length > 0 ? (
            <div className="combat-picker">
              <Select
                ariaLabel={m.games.combatSetup.addCharacterAria}
                value=""
                searchable
                placeholder={m.games.combatSetup.characterPlaceholder}
                options={characterOptions}
                onChange={addCharacter}
              />
            </div>
          ) : availableCharacters.length === 0 ? (
            <p className="abilities-editor__empty">
              {m.games.combatSetup.charactersAllDefeated}
            </p>
          ) : (
            <p className="abilities-editor__empty">
              {m.games.combatSetup.charactersAllAdded}
            </p>
          )}

          {combatants.some((combatant) => combatant.kind === 'character') ? (
            <ul className="combat-list">
              {combatants
                .filter((combatant) => combatant.kind === 'character')
                .map(renderCard)}
            </ul>
          ) : null}
        </section>

        <section className="combat-section" aria-labelledby="combat-monsters">
          <header className="combat-section__head">
            <h3 id="combat-monsters">{m.games.combatSetup.monstersTitle}</h3>
            <span className="combat-section__count">
              {fill(m.games.combatSetup.monstersCount, { count: game.monsters.length })}
            </span>
          </header>

          {game.monsters.length === 0 ? (
            <p className="abilities-editor__empty">{m.games.combatSetup.monstersEmpty}</p>
          ) : monsterOptions.length > 0 ? (
            <div className="combat-picker">
              <Select
                ariaLabel={m.games.combatSetup.addMonsterAria}
                value=""
                searchable
                placeholder={m.games.combatSetup.monsterPlaceholder}
                options={monsterOptions}
                onChange={(monsterId) => {
                  const monster = game.monsters.find((item) => item.id === monsterId)
                  if (monster) addMonster(monster)
                }}
              />
            </div>
          ) : availableMonsters.length === 0 ? (
            <p className="abilities-editor__empty">
              {m.games.combatSetup.monstersAllDefeated}
            </p>
          ) : (
            <p className="abilities-editor__empty">
              {m.games.combatSetup.monstersAllAdded}
            </p>
          )}

          {combatants.some((combatant) => combatant.kind === 'monster') ? (
            <ul className="combat-list">
              {combatants
                .filter((combatant) => combatant.kind === 'monster')
                .map(renderCard)}
            </ul>
          ) : null}
        </section>

        {hint ? <p className="combat-form__hint">{hint}</p> : null}
      </form>
    </Modal>
  )
}
