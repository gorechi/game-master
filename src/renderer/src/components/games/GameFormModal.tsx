import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, JSX } from 'react'
import type { Game, GameMonster } from '@shared/game'
import type { CharacterProfile } from '@shared/characterProfile'
import type { Monster } from '@shared/monster'
import type { Player } from '@shared/player'
import { createGameMonster, formatChallengeRating, playerFullName } from '@shared/domain'
import { api, errorMessage } from '@renderer/lib/api'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { IconPencil, IconTrash } from '../ui/icons'
import { MonsterFormModal } from '../monsters/MonsterFormModal'

interface GameFormModalProps {
  open: boolean
  game: Game | null
  onClose: () => void
  onSaved: (game: Game) => void
}

function characterInitial(character: CharacterProfile): string {
  return character.name.trim().charAt(0).toUpperCase() || '?'
}

export function GameFormModal({ open, game, onClose, onSaved }: GameFormModalProps): JSX.Element {
  const [name, setName] = useState('')
  const [characterIds, setCharacterIds] = useState<string[]>([])
  const [monsters, setMonsters] = useState<GameMonster[]>([])
  const [characters, setCharacters] = useState<CharacterProfile[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [bestiary, setBestiary] = useState<Monster[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  const [editingMonsterId, setEditingMonsterId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const formId = useId()
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return

    setName(game?.name ?? '')
    setCharacterIds(game?.characterIds ?? [])
    setMonsters(game?.monsters ?? [])
    setEditingMonsterId(null)
    setError(null)
    setSaving(false)
    setDataError(null)
    setLoadingData(true)

    let cancelled = false

    void Promise.all([api.characters.list(), api.players.list(), api.monsters.list()])
      .then(([nextCharacters, nextPlayers, nextBestiary]) => {
        if (cancelled) return
        setCharacters(nextCharacters)
        setPlayers(nextPlayers)
        setBestiary(nextBestiary)
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
  }, [open, game])

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

    setMonsters((current) => [
      ...current,
      createGameMonster(
        source,
        current.map((monster) => monster.name)
      )
    ])
  }

  function removeMonster(monsterId: string): void {
    setMonsters((current) => current.filter((monster) => monster.id !== monsterId))
    setEditingMonsterId((current) => (current === monsterId ? null : current))
  }

  const editingMonster = editingMonsterId
    ? (monsters.find((monster) => monster.id === editingMonsterId) ?? null)
    : null

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (saving || loadingData) return

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
      const input = {
        name: trimmedName,
        characterIds: validCharacterIds,
        monsters
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
      title={game ? 'Редактировать игру' : 'Новая игра'}
      description="Название, участники и монстры. Монстры добавляются копиями — правки в игре не меняют бестиарий."
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
            disabled={saving || loadingData || Boolean(dataError)}
          >
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </>
      }
    >
      <form id={formId} className="game-editor" noValidate onSubmit={(event) => void submit(event)}>
        <label className="field">
          <span className="field__label">Название игры</span>
          <input
            ref={nameRef}
            className="input"
            value={name}
            maxLength={120}
            placeholder="Проклятие Страда"
            autoComplete="off"
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
                <span className="editor-section__count">
                  выбрано {characterIds.length}
                </span>
              </header>

              {characters.length === 0 ? (
                <p className="notice">
                  В базе нет персонажей — сначала добавьте их в разделе «Персонажи».
                </p>
              ) : (
                <div className="participant-list">
                  {characters.map((character) => {
                    const checked = characterIds.includes(character.id)

                    return (
                      <label
                        key={character.id}
                        className={`participant-row${checked ? ' participant-row--on' : ''}`}
                      >
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={checked}
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
                <span className="editor-section__count">{monsters.length}</span>
              </header>

              {bestiary.length === 0 ? (
                <p className="notice">В бестиарии пока нет монстров.</p>
              ) : (
                <Select
                  ariaLabel="Добавить монстра из бестиария"
                  value=""
                  placeholder="Добавить из бестиария…"
                  options={bestiary.map((monster) => ({
                    value: monster.id,
                    label: `${monster.name} · КО ${formatChallengeRating(monster.challengeRating)}`
                  }))}
                  onChange={addMonster}
                />
              )}

              {monsters.length === 0 ? (
                <p className="abilities-editor__empty">Пока ни одного монстра в игре.</p>
              ) : (
                <ul className="game-monster-list">
                  {monsters.map((monster) => (
                    <li className="game-monster-row" key={monster.id}>
                      <span className="game-monster-row__name">{monster.name}</span>
                      <span className="game-monster-row__meta">
                        КО {formatChallengeRating(monster.challengeRating)} · КЗ{' '}
                        {monster.armorClass} · ХП {monster.hitPoints}
                      </span>
                      <div className="game-monster-row__actions">
                        <button
                          type="button"
                          className="icon-button"
                          title="Редактировать монстра в игре"
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
                          onClick={() => removeMonster(monster.id)}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <p className="game-editor__hint">
                Можно добавить одного и того же монстра несколько раз — каждый станет отдельным
                экземпляром со своим именем и характеристиками.
              </p>
            </section>
          </>
        )}

        {error ? <p className="notice notice--error">{error}</p> : null}
      </form>

      <MonsterFormModal
        open={editingMonster !== null}
        title="Монстр в игре"
        description="Копия для этой игры. Изменения не затронут запись в бестиарии."
        initial={editingMonster}
        onClose={() => setEditingMonsterId(null)}
        onSubmit={(input) => {
          setMonsters((current) =>
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
