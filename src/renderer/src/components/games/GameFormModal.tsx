import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, JSX, KeyboardEvent } from 'react'
import type { Game, GameMonster } from '@shared/game'
import type { GameMonsterEntry } from '@shared/gameMonster'
import type { CharacterProfile } from '@shared/characterProfile'
import type { Monster } from '@shared/monster'
import type { Player } from '@shared/player'
import type { GameMap } from '@shared/map'
import type { Realm } from '@shared/realm'
import { createGameMonster, formatChallengeRating, gameMonsterFromEntry, playerFullName } from '@shared/domain'
import { api, errorMessage } from '@renderer/lib/api'
import { useI18n } from '@renderer/i18n/LocaleProvider'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { IconMapPin, IconPencil, IconTrash } from '../ui/icons'
import { MonsterFormModal } from '../monsters/MonsterFormModal'
import { MonsterPlacementModal } from './MonsterPlacementModal'

interface GameFormModalProps {
  open: boolean
  game: Game | null
  /** Все сеттинги: при создании игры мастер выбирает один из них. */
  realms: readonly Realm[]
  /** Для создания продолжения: сеттинг исходной игры. */
  initialRealmId?: string
  /** Для создания продолжения: участники, уже отмеченные в форме. */
  initialCharacterIds?: string[]
  /** Для создания продолжения: карта исходной игры. */
  initialMapId?: string | null
  /** Только просмотр: все поля недоступны, кнопки сохранения нет. */
  readOnly?: boolean
  onClose: () => void
  onSaved: (game: Game) => void
}

/** Монстр, выбранный на форме создания: базовая запись + количество. */
interface MonsterSelection {
  sourceId: string
  name: string
  challengeRating: number
  armorClass: number
  hitPoints: number
  count: number
}

interface MonsterPlacement {
  mapId: string
  placeId: string
}

function characterInitial(character: CharacterProfile): string {
  return character.name.trim().charAt(0).toUpperCase() || '?'
}

/**
 * Карта игры и все карты, до которых можно добраться по выходам.
 * Порядок: сначала карта игры, затем остальные по порядку из списка карт.
 */
function reachableMaps(maps: readonly GameMap[], rootMapId: string): GameMap[] {
  const byId = new Map(maps.map((map) => [map.id, map]))
  if (!byId.has(rootMapId)) return []

  const included = new Set<string>()
  const queue = [rootMapId]

  while (queue.length > 0) {
    const mapId = queue.pop()!
    if (included.has(mapId)) continue

    const map = byId.get(mapId)
    if (!map) continue

    included.add(mapId)
    for (const place of map.places) {
      if (place.linkedMapId && !included.has(place.linkedMapId)) {
        queue.push(place.linkedMapId)
      }
    }
  }

  const ordered = maps.filter((map) => included.has(map.id))
  const root = ordered.find((map) => map.id === rootMapId)
  return root ? [root, ...ordered.filter((map) => map.id !== rootMapId)] : ordered
}

/**
 * Разворачивает выбор «монстр + количество» в экземпляры.
 * Вызывается только при создании игры — до сохранения копии не существуют.
 */
function expandSelections(
  selections: MonsterSelection[],
  bestiary: Monster[],
  initialNames: readonly string[] = []
): GameMonster[] {
  const usedNames = [...initialNames]
  const result: GameMonster[] = []

  for (const selection of selections) {
    const source = bestiary.find((monster) => monster.id === selection.sourceId)
    if (!source) continue

    for (let index = 0; index < selection.count; index += 1) {
      const created = createGameMonster(source, usedNames)
      result.push(created)
      usedNames.push(created.name)
    }
  }

  return result
}

export function GameFormModal({
  open,
  game,
  realms,
  initialRealmId,
  initialCharacterIds,
  initialMapId,
  readOnly = false,
  onClose,
  onSaved
}: GameFormModalProps): JSX.Element {
  const { messages: m, fill } = useI18n()
  const isEdit = game !== null

  const [name, setName] = useState('')
  const [realmId, setRealmId] = useState('')
  const [mapId, setMapId] = useState('')
  const [characterIds, setCharacterIds] = useState<string[]>([])
  const [playerFilter, setPlayerFilter] = useState('all')
  const [activeTab, setActiveTab] = useState<'participants' | 'monsters'>('participants')
  const [selections, setSelections] = useState<MonsterSelection[]>([])
  const [instances, setInstances] = useState<GameMonster[]>([])
  const [savedMonsters, setSavedMonsters] = useState<GameMonsterEntry[]>([])
  const [readyIds, setReadyIds] = useState<string[]>([])
  const [editingMonsterId, setEditingMonsterId] = useState<string | null>(null)
  const [placements, setPlacements] = useState<Record<string, MonsterPlacement>>({})
  const [placementMonsterId, setPlacementMonsterId] = useState<string | null>(null)
  const [characters, setCharacters] = useState<CharacterProfile[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [bestiary, setBestiary] = useState<Monster[]>([])
  const [maps, setMaps] = useState<GameMap[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const formId = useId()
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return

    setName(game?.name ?? '')
    setRealmId(game?.realmId ?? initialRealmId ?? '')
    setMapId(game?.mapId ?? initialMapId ?? '')
    setCharacterIds(game?.characterIds ?? initialCharacterIds ?? [])
    setPlayerFilter('all')
    setActiveTab('participants')
    setSelections([])
    setInstances(game?.monsters ?? [])
    setReadyIds([])
    setEditingMonsterId(null)
    setPlacements(
      Object.fromEntries(
        (game?.monsterPlacements ?? []).map((placement) => [
          placement.monsterId,
          { mapId: placement.mapId, placeId: placement.placeId }
        ])
      )
    )
    setPlacementMonsterId(null)
    setError(null)
    setSaving(false)
    setDataError(null)
    setLoadingData(true)

    let cancelled = false

    void Promise.all([
      api.characters.list(),
      api.players.list(),
      api.monsters.list(),
      api.gameMonsters.list(),
      api.maps.list()
    ])
      .then(([nextCharacters, nextPlayers, nextBestiary, nextSavedMonsters, nextMaps]) => {
        if (cancelled) return
        setCharacters(nextCharacters)
        setPlayers(nextPlayers)
        setBestiary(nextBestiary)
        setSavedMonsters(nextSavedMonsters)
        setMaps(nextMaps)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setDataError(errorMessage(caught))
      })
      .finally(() => {
        if (!cancelled) setLoadingData(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, game, initialRealmId, initialCharacterIds, initialMapId])

  function changeRealm(nextRealmId: string): void {
    setRealmId(nextRealmId)
    setMapId('')
    setCharacterIds([])
    setSelections([])
    setInstances([])
    setReadyIds([])
    setEditingMonsterId(null)
    setPlacements({})
    setPlacementMonsterId(null)
    setError(null)
  }

  function changeMap(nextMapId: string): void {
    setMapId(nextMapId)
    setPlacements({})
    setPlacementMonsterId(null)
  }

  function playerName(playerId: string | null): string {
    const player = playerId ? players.find((item) => item.id === playerId) : undefined
    return player ? playerFullName(player) : m.games.form.noPlayer
  }

  function toggleCharacter(characterId: string): void {
    setCharacterIds((current) =>
      current.includes(characterId)
        ? current.filter((id) => id !== characterId)
        : [...current, characterId]
    )
  }

  function addMonster(sourceId: string): void {
    const source = realmBestiary.find((monster) => monster.id === sourceId)
    if (!source) return

    if (isEdit) {
      // Игра уже существует: новый экземпляр сразу можно редактировать.
      setInstances((current) => [
        ...current,
        createGameMonster(
          source,
          current.map((monster) => monster.name)
        )
      ])
      return
    }

    setSelections((current) => {
      const existing = current.find((selection) => selection.sourceId === sourceId)
      if (existing) {
        return current.map((selection) =>
          selection.sourceId === sourceId
            ? { ...selection, count: selection.count + 1 }
            : selection
        )
      }

      return [
        ...current,
        {
          sourceId,
          name: source.name,
          challengeRating: source.challengeRating,
          armorClass: source.armorClass,
          hitPoints: source.hitPoints,
          count: 1
        }
      ]
    })
  }

  function setCount(sourceId: string, value: number): void {
    const count = Number.isFinite(value) ? Math.min(99, Math.max(1, Math.round(value))) : 1
    setSelections((current) =>
      current.map((selection) =>
        selection.sourceId === sourceId ? { ...selection, count } : selection
      )
    )
  }

  function removeSelection(sourceId: string): void {
    setSelections((current) => current.filter((selection) => selection.sourceId !== sourceId))
  }

  function addSavedMonster(entryId: string): void {
    setReadyIds((current) => (current.includes(entryId) ? current : [...current, entryId]))
  }

  function removeSavedMonster(entryId: string): void {
    setReadyIds((current) => current.filter((id) => id !== entryId))
  }

  function removeInstance(instanceId: string): void {
    setInstances((current) => current.filter((monster) => monster.id !== instanceId))
    setEditingMonsterId((current) => (current === instanceId ? null : current))
    setPlacements((current) => {
      if (!current[instanceId]) return current
      const next = { ...current }
      delete next[instanceId]
      return next
    })
    setPlacementMonsterId((current) => (current === instanceId ? null : current))
  }

  const editingMonster = editingMonsterId
    ? (instances.find((monster) => monster.id === editingMonsterId) ?? null)
    : null

  const totalSelections = selections.reduce((sum, selection) => sum + selection.count, 0)
  const realmCharacters = characters.filter((character) => character.realmId === realmId)
  const realmBestiary = bestiary.filter((monster) => monster.realmId === realmId)
  const realmSavedMonsters = savedMonsters.filter((monster) => monster.realmId === realmId)
  const realmMaps = maps.filter((map) => map.realmId === realmId)
  const placementMaps = mapId ? reachableMaps(realmMaps, mapId) : []
  const canPlaceMonsters = isEdit && !readOnly && placementMaps.length > 0
  const placementMonster = placementMonsterId
    ? (instances.find((monster) => monster.id === placementMonsterId) ?? null)
    : null
  const placementDraft = placementMonster ? placements[placementMonster.id] : undefined
  const availableBestiary = realmBestiary.filter(
    (monster) => !selections.some((selection) => selection.sourceId === monster.id)
  )

  const readyMonsters = realmSavedMonsters.filter((monster) => readyIds.includes(monster.id))
  const availableSaved = realmSavedMonsters.filter((monster) => !readyIds.includes(monster.id))
  const totalMonsters = isEdit ? instances.length : totalSelections + readyMonsters.length

  const filteredCharacters =
    playerFilter === 'all'
      ? realmCharacters
      : realmCharacters.filter((character) => character.playerId === playerFilter)
  const playerFilterOptions = [
    { value: 'all', label: m.games.form.allPlayers },
    ...players.map((player) => ({ value: player.id, label: playerFullName(player) }))
  ]

  const participantsTabId = `${formId}-participants-tab`
  const monstersTabId = `${formId}-monsters-tab`
  const participantsPanelId = `${formId}-participants-panel`
  const monstersPanelId = `${formId}-monsters-panel`

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

    event.preventDefault()
    const next = activeTab === 'participants' ? 'monsters' : 'participants'
    setActiveTab(next)
    document.getElementById(next === 'participants' ? participantsTabId : monstersTabId)?.focus()
  }

  function renderInstanceRow(monster: GameMonster): JSX.Element {
    const placement = placements[monster.id]
    const placedMap = placement
      ? placementMaps.find((map) => map.id === placement.mapId)
      : undefined
    const placedPlace = placedMap?.places.find(
      (place) => place.id === placement?.placeId
    )
    const placed = Boolean(placedMap && placedPlace)
    const placementTitle =
      placedMap && placedPlace
        ? fill(m.games.form.placementEdit, {
            map: placedMap.name,
            place: placedPlace.name
          })
        : m.games.form.placementAdd

    return (
      <li className="game-monster-row" key={monster.id}>
        <span className="game-monster-row__title">
          <span className="game-monster-row__name">{monster.name}</span>
        </span>
        <span className="game-monster-row__meta">
          {fill(m.games.monsterStats, {
            cr: formatChallengeRating(monster.challengeRating),
            ac: monster.armorClass,
            hp: monster.hitPoints
          })}
        </span>

        {!readOnly ? (
          <div className="game-monster-row__side">
            <div className="game-monster-row__actions">
              {canPlaceMonsters ? (
                <button
                  type="button"
                  className={`icon-button game-monster-row__place${
                    placed ? ' game-monster-row__place--active' : ''
                  }`}
                  title={placementTitle}
                  aria-label={placementTitle}
                  onClick={() => setPlacementMonsterId(monster.id)}
                >
                  <IconMapPin />
                </button>
              ) : null}
              <button
                type="button"
                className="icon-button"
                title={m.games.form.editInstance}
                aria-label={fill(m.games.form.editInstanceAria, { name: monster.name })}
                onClick={() => setEditingMonsterId(monster.id)}
              >
                <IconPencil />
              </button>
              <button
                type="button"
                className="icon-button icon-button--danger"
                title={m.games.form.removeFromGame}
                aria-label={fill(m.games.form.removeFromGameAria, { name: monster.name })}
                onClick={() => removeInstance(monster.id)}
              >
                <IconTrash />
              </button>
            </div>
          </div>
        ) : null}
      </li>
    )
  }

  function renderReadyRow(monster: GameMonsterEntry): JSX.Element {
    return (
      <li className="game-monster-row" key={monster.id}>
        <span className="game-monster-row__title">
          <span className="game-monster-row__name">{monster.name}</span>
          <span className="game-monster-row__badge">{m.games.form.uniqueBadge}</span>
        </span>
        <span className="game-monster-row__meta">
          {fill(m.games.monsterStats, {
            cr: formatChallengeRating(monster.challengeRating),
            ac: monster.armorClass,
            hp: monster.hitPoints
          })}
        </span>

        <div className="game-monster-row__side">
          <div className="game-monster-row__actions">
            <button
              type="button"
              className="icon-button icon-button--danger"
              title={m.games.form.removeFromGame}
              aria-label={fill(m.games.form.removeFromGameAria, { name: monster.name })}
              onClick={() => removeSavedMonster(monster.id)}
            >
              <IconTrash />
            </button>
          </div>
        </div>
      </li>
    )
  }

  function renderSelectionRow(selection: MonsterSelection): JSX.Element {
    return (
      <li className="game-monster-row" key={selection.sourceId}>
        <span className="game-monster-row__title">
          <span className="game-monster-row__name">{selection.name}</span>
        </span>
        <span className="game-monster-row__meta">
          {fill(m.games.monsterStats, {
            cr: formatChallengeRating(selection.challengeRating),
            ac: selection.armorClass,
            hp: selection.hitPoints
          })}
        </span>

        <div className="game-monster-row__side">
          <div className="game-monster-row__count">
            <button
              type="button"
              className="count-button"
              aria-label={fill(m.games.form.decreaseCountAria, { name: selection.name })}
              disabled={selection.count <= 1}
              onClick={() => setCount(selection.sourceId, selection.count - 1)}
            >
              −
            </button>

            <input
              className="input count-input"
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              value={selection.count}
              aria-label={fill(m.games.form.countAria, { name: selection.name })}
              onChange={(event) =>
                setCount(selection.sourceId, Number.parseInt(event.target.value, 10))
              }
            />

            <button
              type="button"
              className="count-button"
              aria-label={fill(m.games.form.increaseCountAria, { name: selection.name })}
              onClick={() => setCount(selection.sourceId, selection.count + 1)}
            >
              +
            </button>
          </div>

          <button
            type="button"
            className="icon-button icon-button--danger"
            title={m.games.form.removeFromGame}
            aria-label={fill(m.games.form.removeFromGameAria, { name: selection.name })}
            onClick={() => removeSelection(selection.sourceId)}
          >
            <IconTrash />
          </button>
        </div>
      </li>
    )
  }

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (saving || loadingData || readOnly) return

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError(m.games.form.nameRequired)
      nameRef.current?.focus()
      return
    }

    if (!realmId) {
      setError(m.games.form.realmRequired)
      return
    }

    const validCharacterIds = characterIds.filter((id) =>
      realmCharacters.some((character) => character.id === id)
    )

    if (validCharacterIds.length === 0) {
      setError(m.games.form.participantRequired)
      setActiveTab('participants')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const readyInstances = isEdit ? [] : readyMonsters.map(gameMonsterFromEntry)
      const validMapId = mapId && realmMaps.some((map) => map.id === mapId) ? mapId : null
      const validPlacements = isEdit
        ? Object.entries(placements).flatMap(([monsterId, placement]) => {
            const placementMap = placementMaps.find(
              (map) => map.id === placement.mapId
            )

            if (
              !instances.some((monster) => monster.id === monsterId) ||
              !placementMap?.places.some((place) => place.id === placement.placeId)
            ) {
              return []
            }

            return [
              {
                monsterId,
                mapId: placement.mapId,
                placeId: placement.placeId
              }
            ]
          })
        : []

      const input = {
        name: trimmedName,
        mapId: validMapId,
        characterIds: validCharacterIds,
        monsters: isEdit
          ? instances
          : [
              ...readyInstances,
              ...expandSelections(
                selections,
                realmBestiary,
                readyInstances.map((monster) => monster.name)
              )
            ],
        monsterPlacements: validPlacements,
        defeatedCharacterIds: (game?.defeatedCharacterIds ?? []).filter((id) =>
          validCharacterIds.includes(id)
        ),
        defeatedMonsterIds: (game?.defeatedMonsterIds ?? []).filter((id) =>
          instances.some((monster) => monster.id === id)
        )
      }

      const saved = game
        ? await api.games.update({ ...game, ...input })
        : await api.games.create(input, realmId)

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
      title={
        readOnly
          ? m.games.form.viewTitle
          : isEdit
            ? m.games.form.editTitle
            : m.games.form.createTitle
      }
      description={
        readOnly
          ? m.games.form.viewDescription
          : isEdit
            ? m.games.form.editDescription
            : m.games.form.createDescription
      }
      size="lg"
      panelClassName="modal--game"
      onClose={onClose}
      initialFocusRef={nameRef}
      footer={
        readOnly ? (
          <button type="button" className="button" onClick={onClose}>
            {m.games.form.close}
          </button>
        ) : (
          <>
            <button type="button" className="button" onClick={onClose} disabled={saving}>
              {m.games.form.cancel}
            </button>
            <button
              type="submit"
              form={formId}
              className="button button--primary"
              disabled={saving || loadingData || Boolean(dataError) || !realmId}
            >
              {saving ? m.games.form.saving : m.games.form.save}
            </button>
          </>
        )
      }
    >
      <form id={formId} className="game-editor" noValidate onSubmit={(event) => void submit(event)}>
        <div className="game-editor__top">
          <label className="field">
            <span className="field__label">{m.games.form.nameLabel}</span>
            <input
              ref={nameRef}
              className={`input${readOnly ? ' input--readonly' : ''}`}
              value={name}
              maxLength={120}
              placeholder={m.games.form.namePlaceholder}
              autoComplete="off"
              readOnly={readOnly}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <div className="field">
            <span className="field__label">{m.games.form.realmLabel}</span>
            <Select
              ariaLabel={m.games.form.realmAria}
              value={realmId}
              placeholder={m.games.form.realmPlaceholder}
              disabled={isEdit || readOnly || realms.length === 0}
              options={realms.map((realm) => ({ value: realm.id, label: realm.name }))}
              onChange={changeRealm}
            />
            <span className="game-editor__hint">
              {isEdit ? m.games.form.realmHintEdit : m.games.form.realmHintCreate}
            </span>
          </div>

          <div className="field">
            <span className="field__label">{m.games.form.mapLabel}</span>
            <Select
              ariaLabel={m.games.form.mapAria}
              value={mapId}
              placeholder={m.games.form.mapNone}
              disabled={readOnly || !realmId}
              options={[
                { value: '', label: m.games.form.mapNone },
                ...realmMaps.map((map) => ({ value: map.id, label: map.name }))
              ]}
              onChange={changeMap}
            />
          </div>
        </div>

        {!realmId ? <p className="notice">{m.games.form.realmNotice}</p> : null}

        {dataError ? <p className="notice notice--error">{dataError}</p> : null}

        {loadingData ? (
          <p className="muted">{m.games.form.loadingData}</p>
        ) : (
          <>
            <div className="form-tabs" role="tablist" aria-label={m.games.form.tabsAria}>
              <button
                id={participantsTabId}
                type="button"
                role="tab"
                aria-selected={activeTab === 'participants'}
                aria-controls={participantsPanelId}
                tabIndex={activeTab === 'participants' ? 0 : -1}
                className={`form-tab${activeTab === 'participants' ? ' form-tab--active' : ''}`}
                onClick={() => setActiveTab('participants')}
                onKeyDown={onTabKeyDown}
              >
                {m.games.form.participantsTab}
                <span className="form-tab__count">{characterIds.length}</span>
              </button>

              <button
                id={monstersTabId}
                type="button"
                role="tab"
                aria-selected={activeTab === 'monsters'}
                aria-controls={monstersPanelId}
                tabIndex={activeTab === 'monsters' ? 0 : -1}
                className={`form-tab${activeTab === 'monsters' ? ' form-tab--active' : ''}`}
                onClick={() => setActiveTab('monsters')}
                onKeyDown={onTabKeyDown}
              >
                {m.games.form.monstersTab}
                <span className="form-tab__count">{totalMonsters}</span>
              </button>
            </div>

            {activeTab === 'participants' ? (
              <section
                className="editor-section"
                id={participantsPanelId}
                role="tabpanel"
                aria-labelledby={participantsTabId}
              >
                <div className="editor-section__toolbar">
                  <span className="editor-section__count">
                    {fill(m.games.form.selectedCount, { count: characterIds.length })}
                  </span>
                  <div className="participant-filter__select">
                    <Select
                      ariaLabel={m.games.form.playerFilterAria}
                      value={playerFilter}
                      options={playerFilterOptions}
                      placeholder={m.games.form.allPlayers}
                      onChange={(value) => setPlayerFilter(value)}
                    />
                  </div>
                </div>

                {realmCharacters.length === 0 ? (
                  <div className="participant-list participant-list--empty">
                    <p className="notice">{m.games.form.noCharacters}</p>
                  </div>
                ) : filteredCharacters.length === 0 ? (
                  <div className="participant-list participant-list--empty">
                    <p className="notice">{m.games.form.noPlayerCharacters}</p>
                  </div>
                ) : (
                  <div className="participant-list">
                    {filteredCharacters.map((character) => {
                      const checked = characterIds.includes(character.id)

                      return (
                        <label
                          key={character.id}
                          className={[
                            'participant-row',
                            checked ? 'participant-row--on' : '',
                            readOnly ? 'participant-row--readonly' : ''
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          <input
                            type="checkbox"
                            className="checkbox"
                            checked={checked}
                            disabled={readOnly}
                            onChange={() => toggleCharacter(character.id)}
                          />

                          <span className="participant-row__avatar" aria-hidden="true">
                            {characterInitial(character)}
                          </span>

                          <span className="participant-row__body">
                            <span className="participant-row__name">{character.name}</span>
                            <span className="participant-row__meta">
                              {[
                                character.className || m.games.form.noClass,
                                fill(m.games.form.level, { level: character.level }),
                                playerName(character.playerId)
                              ].join(' · ')}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </section>
            ) : (
              <section
                className="editor-section"
                id={monstersPanelId}
                role="tabpanel"
                aria-labelledby={monstersTabId}
              >
                {!readOnly ? (
                  <div className={`monster-pickers${isEdit ? ' monster-pickers--single' : ''}`}>
                    <div className="field">
                      <span className="field__label">{m.games.form.bestiaryLabel}</span>
                      {realmBestiary.length === 0 ? (
                        <p className="abilities-editor__empty">
                          {m.games.form.bestiaryEmpty}
                        </p>
                      ) : !isEdit && availableBestiary.length === 0 ? (
                        <p className="abilities-editor__empty">
                          {m.games.form.bestiaryAllAdded}
                        </p>
                      ) : (
                        <Select
                          ariaLabel={
                            isEdit
                              ? m.games.form.bestiaryAriaEdit
                              : m.games.form.bestiaryAriaCreate
                          }
                          value=""
                          searchable
                          placeholder={m.games.form.searchMonster}
                          options={(isEdit ? realmBestiary : availableBestiary).map((monster) => ({
                            value: monster.id,
                            label: fill(m.games.form.monsterOption, {
                              name: monster.name,
                              cr: formatChallengeRating(monster.challengeRating)
                            })
                          }))}
                          onChange={addMonster}
                        />
                      )}
                    </div>

                    {!isEdit ? (
                      <div className="field">
                        <span className="field__label">{m.games.form.savedLabel}</span>
                        {realmSavedMonsters.length === 0 ? (
                          <p className="abilities-editor__empty">
                            {m.games.form.savedEmpty}
                          </p>
                        ) : availableSaved.length === 0 ? (
                          <p className="abilities-editor__empty">
                            {m.games.form.savedAllAdded}
                          </p>
                        ) : (
                          <Select
                            ariaLabel={m.games.form.savedAria}
                            value=""
                            searchable
                            placeholder={m.games.form.searchSaved}
                            options={availableSaved.map((monster) => ({
                              value: monster.id,
                              label: fill(m.games.form.monsterOption, {
                                name: monster.name,
                                cr: formatChallengeRating(monster.challengeRating)
                              })
                            }))}
                            onChange={addSavedMonster}
                          />
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <ul
                  className="game-monster-list game-monster-list--scroll"
                  aria-label={m.games.form.monstersListAria}
                >
                  {isEdit ? (
                    instances.length === 0 ? (
                      <li className="game-monster-list__empty">
                        {m.games.form.monstersEmpty}
                      </li>
                    ) : (
                      instances.map(renderInstanceRow)
                    )
                  ) : readyMonsters.length === 0 && selections.length === 0 ? (
                    <li className="game-monster-list__empty">
                      {m.games.form.addMonsters}
                    </li>
                  ) : (
                    <>
                      {readyMonsters.map(renderReadyRow)}
                      {selections.map(renderSelectionRow)}
                    </>
                  )}
                </ul>

                <p className="game-editor__hint">
                  {readOnly
                    ? m.games.form.hintReadOnly
                    : isEdit
                      ? m.games.form.hintEdit
                      : m.games.form.hintCreate}
                </p>
              </section>
            )}
          </>
        )}

        {error ? <p className="notice notice--error">{error}</p> : null}
      </form>

      <MonsterFormModal
        open={editingMonster !== null}
        title={m.games.form.monsterModalTitle}
        description={m.games.form.monsterModalDescription}
        initial={editingMonster}
        allowZeroHitPoints
        showStatuses
        onClose={() => setEditingMonsterId(null)}
        onSubmit={(input) => {
          setInstances((current) =>
            current.map((monster) =>
              monster.id === editingMonsterId ? { ...monster, ...input } : monster
            )
          )
          setEditingMonsterId(null)
        }}
      />

      <MonsterPlacementModal
        open={placementMonster !== null}
        monsterName={placementMonster?.name ?? ''}
        maps={placementMaps}
        initialMapId={placementDraft?.mapId ?? mapId}
        initialPlaceId={placementDraft?.placeId ?? ''}
        onClose={() => setPlacementMonsterId(null)}
        onSave={(nextMapId, nextPlaceId) => {
          if (!placementMonster) return
          setPlacements((current) => ({
            ...current,
            [placementMonster.id]: { mapId: nextMapId, placeId: nextPlaceId }
          }))
          setPlacementMonsterId(null)
        }}
      />
    </Modal>
  )
}
