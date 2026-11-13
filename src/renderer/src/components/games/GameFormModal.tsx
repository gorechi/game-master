import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, JSX } from 'react'
import type { Game, GameMonster } from '@shared/game'
import type { GameMonsterEntry } from '@shared/gameMonster'
import type { CharacterProfile } from '@shared/characterProfile'
import type { Monster } from '@shared/monster'
import type { Player } from '@shared/player'
import { createGameMonster, formatChallengeRating, gameMonsterFromEntry, playerFullName } from '@shared/domain'
import { api, errorMessage } from '@renderer/lib/api'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { IconPencil, IconTrash } from '../ui/icons'
import { MonsterFormModal } from '../monsters/MonsterFormModal'

interface GameFormModalProps {
  open: boolean
  game: Game | null
  /** Для создания продолжения: участники, уже отмеченные в форме. */
  initialCharacterIds?: string[]
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

function characterInitial(character: CharacterProfile): string {
  return character.name.trim().charAt(0).toUpperCase() || '?'
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
  initialCharacterIds,
  readOnly = false,
  onClose,
  onSaved
}: GameFormModalProps): JSX.Element {
  const isEdit = game !== null

  const [name, setName] = useState('')
  const [characterIds, setCharacterIds] = useState<string[]>([])
  const [playerFilter, setPlayerFilter] = useState('all')
  const [selections, setSelections] = useState<MonsterSelection[]>([])
  const [instances, setInstances] = useState<GameMonster[]>([])
  const [savedMonsters, setSavedMonsters] = useState<GameMonsterEntry[]>([])
  const [readyIds, setReadyIds] = useState<string[]>([])
  const [editingMonsterId, setEditingMonsterId] = useState<string | null>(null)
  const [characters, setCharacters] = useState<CharacterProfile[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [bestiary, setBestiary] = useState<Monster[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const formId = useId()
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return

    setName(game?.name ?? '')
    setCharacterIds(game?.characterIds ?? initialCharacterIds ?? [])
    setPlayerFilter('all')
    setSelections([])
    setInstances(game?.monsters ?? [])
    setReadyIds([])
    setEditingMonsterId(null)
    setError(null)
    setSaving(false)
    setDataError(null)
    setLoadingData(true)

    let cancelled = false

    void Promise.all([
      api.characters.list(),
      api.players.list(),
      api.monsters.list(),
      api.gameMonsters.list()
    ])
      .then(([nextCharacters, nextPlayers, nextBestiary, nextSavedMonsters]) => {
        if (cancelled) return
        setCharacters(nextCharacters)
        setPlayers(nextPlayers)
        setBestiary(nextBestiary)
        setSavedMonsters(nextSavedMonsters)
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
  }, [open, game, initialCharacterIds])

  function playerName(playerId: string | null): string {
    const player = playerId ? players.find((item) => item.id === playerId) : undefined
    return player ? playerFullName(player) : 'без игрока'
  }

  function toggleCharacter(characterId: string): void {
    setCharacterIds((current) =>
      current.includes(characterId)
        ? current.filter((id) => id !== characterId)
        : [...current, characterId]
    )
  }

  function addMonster(sourceId: string): void {
    const source = bestiary.find((monster) => monster.id === sourceId)
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
  }

  const editingMonster = editingMonsterId
    ? (instances.find((monster) => monster.id === editingMonsterId) ?? null)
    : null

  const totalSelections = selections.reduce((sum, selection) => sum + selection.count, 0)
  const availableBestiary = bestiary.filter(
    (monster) => !selections.some((selection) => selection.sourceId === monster.id)
  )

  const readyMonsters = savedMonsters.filter((monster) => readyIds.includes(monster.id))
  const availableSaved = savedMonsters.filter((monster) => !readyIds.includes(monster.id))
  const totalMonsters = isEdit ? instances.length : totalSelections + readyMonsters.length

  const filteredCharacters =
    playerFilter === 'all'
      ? characters
      : characters.filter((character) => character.playerId === playerFilter)
  const playerFilterOptions = [
    { value: 'all', label: 'Все' },
    ...players.map((player) => ({ value: player.id, label: playerFullName(player) }))
  ]

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (saving || loadingData || readOnly) return

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Укажите название игры')
      nameRef.current?.focus()
      return
    }

    const validCharacterIds = characterIds.filter((id) =>
      characters.some((character) => character.id === id)
    )

    if (validCharacterIds.length === 0) {
      setError('Выберите хотя бы одного участника')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const readyInstances = isEdit ? [] : readyMonsters.map(gameMonsterFromEntry)

      const input = {
        name: trimmedName,
        characterIds: validCharacterIds,
        monsters: isEdit
          ? instances
          : [
              ...readyInstances,
              ...expandSelections(
                selections,
                bestiary,
                readyInstances.map((monster) => monster.name)
              )
            ]
      }

      const saved = game
        ? await api.games.update({ ...game, ...input })
        : await api.games.create(input)

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
      title={readOnly ? 'Просмотр игры' : isEdit ? 'Редактировать игру' : 'Новая игра'}
      description={
        readOnly
          ? 'Завершённая игра — только просмотр. Изменения недоступны.'
          : isEdit
            ? 'Участники и уже созданные монстры. Экземпляры можно открывать и редактировать — бестиарий не меняется.'
            : 'Название, участники и монстры. Копии монстров создаются при сохранении игры.'
      }
      size="lg"
      onClose={onClose}
      initialFocusRef={nameRef}
      footer={
        readOnly ? (
          <button type="button" className="button" onClick={onClose}>
            Закрыть
          </button>
        ) : (
          <>
            <button type="button" className="button" onClick={onClose} disabled={saving}>
              Отмена
            </button>
            <button
              type="submit"
              form={formId}
              className="button button--primary"
              disabled={saving || loadingData || Boolean(dataError)}
            >
              {saving ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </>
        )
      }
    >
      <form id={formId} className="game-editor" noValidate onSubmit={(event) => void submit(event)}>
        <label className="field">
          <span className="field__label">Название игры</span>
          <input
            ref={nameRef}
            className={`input${readOnly ? ' input--readonly' : ''}`}
            value={name}
            maxLength={120}
            placeholder="Проклятие Страда"
            autoComplete="off"
            readOnly={readOnly}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        {dataError ? <p className="notice notice--error">{dataError}</p> : null}

        {loadingData ? (
          <p className="muted">Загружаем персонажей и бестиарий…</p>
        ) : (
          <>
            <section className="editor-section">
              <header className="editor-section__head">
                <h3>Участники</h3>

                <div className="participant-filter">
                  <span className="editor-section__count">выбрано {characterIds.length}</span>
                  <div className="participant-filter__select">
                    <Select
                      ariaLabel="Фильтр участников по игроку"
                      value={playerFilter}
                      options={playerFilterOptions}
                      placeholder="Все"
                      onChange={(value) => setPlayerFilter(value)}
                    />
                  </div>
                </div>
              </header>

              {characters.length === 0 ? (
                <p className="notice">
                  В базе нет персонажей — сначала добавьте их в разделе «Персонажи».
                </p>
              ) : filteredCharacters.length === 0 ? (
                <p className="notice">У этого игрока пока нет персонажей.</p>
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
                              character.className || 'без класса',
                              `ур. ${character.level}`,
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

            <section className="editor-section">
              <header className="editor-section__head">
                <h3>Монстры</h3>
                <span className="editor-section__count">{totalMonsters}</span>
              </header>

              {!readOnly ? (
                <div className="monster-pickers">
                  <div className="field">
                    <span className="field__label">Из бестиария</span>
                    {bestiary.length === 0 ? (
                      <p className="abilities-editor__empty">В бестиарии пока нет монстров.</p>
                    ) : !isEdit && availableBestiary.length === 0 ? (
                      <p className="abilities-editor__empty">
                        Все монстры из бестиария уже добавлены.
                      </p>
                    ) : (
                      <Select
                        ariaLabel={
                          isEdit ? 'Добавить монстра из бестиария' : 'Выбрать монстра из бестиария'
                        }
                        value=""
                        searchable
                        placeholder="Найти монстра…"
                        options={(isEdit ? bestiary : availableBestiary).map((monster) => ({
                          value: monster.id,
                          label: `${monster.name} · КО ${formatChallengeRating(
                            monster.challengeRating
                          )}`
                        }))}
                        onChange={addMonster}
                      />
                    )}
                  </div>

                  {!isEdit ? (
                    <div className="field">
                      <span className="field__label">Сохранённые игровые монстры</span>
                      {savedMonsters.length === 0 ? (
                        <p className="abilities-editor__empty">
                          Появляются здесь после удаления игры с сохранением монстров.
                        </p>
                      ) : availableSaved.length === 0 ? (
                        <p className="abilities-editor__empty">
                          Все сохранённые монстры уже добавлены.
                        </p>
                      ) : (
                        <Select
                          ariaLabel="Добавить сохранённого монстра"
                          value=""
                          searchable
                          placeholder="Найти сохранённого монстра…"
                          options={availableSaved.map((monster) => ({
                            value: monster.id,
                            label: `${monster.name} · КО ${formatChallengeRating(
                              monster.challengeRating
                            )}`
                          }))}
                          onChange={addSavedMonster}
                        />
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {isEdit ? (
                instances.length === 0 ? (
                  <p className="abilities-editor__empty">Пока ни одного монстра в игре.</p>
                ) : (
                  <ul className="game-monster-list">
                    {instances.map((monster) => (
                      <li className="game-monster-row" key={monster.id}>
                        <span className="game-monster-row__name">{monster.name}</span>
                        <span className="game-monster-row__meta">
                          КО {formatChallengeRating(monster.challengeRating)} · КЗ{' '}
                          {monster.armorClass} · ХП {monster.hitPoints}
                        </span>

                        {!readOnly ? (
                          <div className="game-monster-row__actions">
                            <button
                              type="button"
                              className="icon-button"
                              title="Редактировать экземпляр"
                              aria-label={`Редактировать ${monster.name}`}
                              onClick={() => setEditingMonsterId(monster.id)}
                            >
                              <IconPencil />
                            </button>
                            <button
                              type="button"
                              className="icon-button icon-button--danger"
                              title="Убрать из игры"
                              aria-label={`Убрать ${monster.name} из игры`}
                              onClick={() => removeInstance(monster.id)}
                            >
                              <IconTrash />
                            </button>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <>
                  {readyMonsters.length > 0 ? (
                    <>
                      <p className="game-editor__group">Готовые экземпляры</p>
                      <ul className="game-monster-list">
                        {readyMonsters.map((monster) => (
                          <li className="game-monster-row" key={monster.id}>
                            <span className="game-monster-row__name">{monster.name}</span>
                            <span className="game-monster-row__badge">готовый</span>
                            <span className="game-monster-row__meta">
                              КО {formatChallengeRating(monster.challengeRating)} · КЗ{' '}
                              {monster.armorClass} · ХП {monster.hitPoints}
                            </span>

                            <div className="game-monster-row__actions">
                              <button
                                type="button"
                                className="icon-button icon-button--danger"
                                title="Убрать из игры"
                                aria-label={`Убрать ${monster.name} из игры`}
                                onClick={() => removeSavedMonster(monster.id)}
                              >
                                <IconTrash />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}

                  {selections.length > 0 ? (
                    <>
                      <p className="game-editor__group">Из бестиария</p>
                      <ul className="game-monster-list">
                        {selections.map((selection) => (
                          <li className="game-monster-row" key={selection.sourceId}>
                            <span className="game-monster-row__name">{selection.name}</span>
                            <span className="game-monster-row__meta">
                              КО {formatChallengeRating(selection.challengeRating)} · КЗ{' '}
                              {selection.armorClass} · ХП {selection.hitPoints}
                            </span>

                            <div className="game-monster-row__count">
                              <button
                                type="button"
                                className="count-button"
                                aria-label={`Уменьшить количество: ${selection.name}`}
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
                                aria-label={`Количество: ${selection.name}`}
                                onChange={(event) =>
                                  setCount(
                                    selection.sourceId,
                                    Number.parseInt(event.target.value, 10)
                                  )
                                }
                              />

                              <button
                                type="button"
                                className="count-button"
                                aria-label={`Увеличить количество: ${selection.name}`}
                                onClick={() => setCount(selection.sourceId, selection.count + 1)}
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              className="icon-button icon-button--danger"
                              title="Убрать из игры"
                              aria-label={`Убрать ${selection.name} из игры`}
                              onClick={() => removeSelection(selection.sourceId)}
                            >
                              <IconTrash />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}

                  {readyMonsters.length === 0 && selections.length === 0 ? (
                    <p className="abilities-editor__empty">Пока ни одного монстра в игре.</p>
                  ) : null}
                </>
              )}

              <p className="game-editor__hint">
                {readOnly
                  ? 'Только просмотр: завершённую игру нельзя редактировать.'
                  : isEdit
                    ? 'Экземпляры созданы вместе с игрой: имя и характеристики у каждого свои, бестиарий остаётся нетронутым.'
                    : 'Экземпляры из бестиария создаются при сохранении. Сохранённые игровые монстры добавляются как есть — без копий и количества.'}
              </p>
            </section>
          </>
        )}

        {error ? <p className="notice notice--error">{error}</p> : null}
      </form>

      <MonsterFormModal
        open={editingMonster !== null}
        title="Монстр в игре"
        description="Экземпляр этой игры. Изменения не затрагивают запись в бестиарии."
        initial={editingMonster}
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
    </Modal>
  )
}
