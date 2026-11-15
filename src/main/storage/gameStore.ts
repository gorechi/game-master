import path from 'node:path'
import { app } from 'electron'
import { createGame, migrateMonsterStats } from '@shared/domain'
import { DEFAULT_REALM_ID } from '@shared/realm'
import {
  GAMES_FILE_SCHEMA_VERSION,
  gamesFileSchema,
  type Game,
  type GameInput,
  type GamesFile
} from '@shared/game'
import type { GameMonsterEntry } from '@shared/gameMonster'
import {
  canTransitionGame,
  isGameDeletable,
  isGameEditable,
  type GameStatus
} from '@shared/gameStatus'
import { JsonFileError, readJsonFile, withFileLock, writeJsonAtomic } from './jsonFile'
import { saveGameMonsters, listGameMonsters } from './gameMonsterStore'

const LOCK_KEY = 'games.json'

export function gamesFile(): string {
  return path.join(app.getPath('userData'), 'games.json')
}

function emptyFile(): GamesFile {
  return { schemaVersion: GAMES_FILE_SCHEMA_VERSION, games: [] }
}

/** Игры хранят копии монстров: их характеристики тоже переводим на 1–30. */
function migrateStoredGame(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw

  const game = raw as Record<string, unknown>
  return {
    ...game,
    monsters: Array.isArray(game.monsters)
      ? game.monsters.map((monster) =>
          monster && typeof monster === 'object'
            ? migrateMonsterStats(monster as Record<string, unknown>)
            : monster
        )
      : game.monsters
  }
}

async function readGamesFile(): Promise<GamesFile> {
  let raw: unknown

  try {
    raw = await readJsonFile(gamesFile())
  } catch (error) {
    if (error instanceof JsonFileError && error.code === 'ENOENT') {
      return emptyFile()
    }
    throw new Error(`Не удалось прочитать список игр: ${(error as Error).message}`)
  }

  if (!raw || typeof raw !== 'object') {
    throw new Error('Файл игр повреждён и не может быть прочитан')
  }

  const file = raw as Record<string, unknown>
  const games = Array.isArray(file.games) ? file.games.map(migrateStoredGame) : file.games

  const parsed = gamesFileSchema.safeParse({ ...file, games })
  if (!parsed.success) {
    throw new Error('Файл игр повреждён и не может быть прочитан')
  }

  return parsed.data
}

function assertGame(input: GameInput): GameInput {
  const name = input.name.trim()
  if (!name) {
    throw new Error('Название игры не может быть пустым')
  }
  return {
    name,
    mapId: input.mapId ?? null,
    notes: input.notes ?? '',
    characterIds: [...new Set(input.characterIds)],
    monsters: input.monsters
  }
}

export async function listGames(realmId?: string): Promise<Game[]> {
  const games = (await readGamesFile()).games
  return realmId ? games.filter((game) => game.realmId === realmId) : games
}

export async function addGame(
  input: GameInput,
  realmId: string = DEFAULT_REALM_ID
): Promise<Game> {
  const normalized = assertGame(input)

  return withFileLock(LOCK_KEY, async () => {
    const file = await readGamesFile()
    const game = createGame(normalized, realmId)

    await writeJsonAtomic(gamesFile(), { ...file, games: [...file.games, game] })
    return game
  })
}

export async function updateGame(game: Game): Promise<Game> {
  const normalized = assertGame(game)

  return withFileLock(LOCK_KEY, async () => {
    const file = await readGamesFile()
    const index = file.games.findIndex((item) => item.id === game.id)

    if (index === -1) {
      throw new Error('Игра не найдена — возможно, запись уже удалена')
    }

    const existing = file.games[index]!

    if (!isGameEditable(existing.status)) {
      throw new Error('Завершённую игру нельзя редактировать')
    }

    const updated: Game = {
      ...existing,
      name: normalized.name,
      mapId: normalized.mapId,
      notes: normalized.notes ?? '',
      characterIds: normalized.characterIds,
      monsters: normalized.monsters,
      updatedAt: new Date().toISOString()
    }

    const games = [...file.games]
    games[index] = updated

    await writeJsonAtomic(gamesFile(), { ...file, games })
    return updated
  })
}

export async function setGameStatus(id: string, status: GameStatus): Promise<Game> {
  return withFileLock(LOCK_KEY, async () => {
    const file = await readGamesFile()
    const index = file.games.findIndex((item) => item.id === id)

    if (index === -1) {
      throw new Error('Игра не найдена — возможно, запись уже удалена')
    }

    const current = file.games[index]!

    if (current.status === status) return current

    if (status === 'finished') {
      throw new Error('Завершайте игру через экран завершения')
    }

    if (!canTransitionGame(current.status, status)) {
      throw new Error('Такой переход статуса недопустим')
    }

    const updated: Game = {
      ...current,
      status,
      updatedAt: new Date().toISOString()
    }

    const games = [...file.games]
    games[index] = updated

    await writeJsonAtomic(gamesFile(), { ...file, games })
    return updated
  })
}

/**
 * Завершает игру, сохраняя выбранных монстров в игровую библиотеку.
 * Уже сохранённые экземпляры сохраняются принудительно.
 */
export async function finishGame(
  id: string,
  keepMonsterIds: readonly string[] = []
): Promise<Game> {
  const games = await readGamesFile()
  const game = games.games.find((item) => item.id === id)

  if (!game) {
    throw new Error('Игра не найдена — возможно, запись уже удалена')
  }

  if (!canTransitionGame(game.status, 'finished')) {
    throw new Error('Завершить можно только идущую или приостановленную игру')
  }

  const saved = await listGameMonsters()
  const savedIds = new Set(saved.map((monster) => monster.id))
  const keep = new Set(keepMonsterIds)

  for (const monster of game.monsters) {
    if (savedIds.has(monster.id)) keep.add(monster.id)
  }

  const savedAt = new Date().toISOString()
  const kept: GameMonsterEntry[] = game.monsters
    .filter((monster) => keep.has(monster.id))
    .map((monster) => ({
      ...monster,
      realmId: game.realmId,
      savedFromGameId: game.id,
      savedAt
    }))

  await saveGameMonsters(kept)

  return withFileLock(LOCK_KEY, async () => {
    const file = await readGamesFile()
    const index = file.games.findIndex((item) => item.id === id)

    if (index === -1) {
      throw new Error('Игра не найдена — возможно, запись уже удалена')
    }

    const current = file.games[index]!

    if (!canTransitionGame(current.status, 'finished')) {
      throw new Error('Завершить можно только идущую или приостановленную игру')
    }

    const updated: Game = {
      ...current,
      status: 'finished',
      updatedAt: new Date().toISOString()
    }

    const next = [...file.games]
    next[index] = updated

    await writeJsonAtomic(gamesFile(), { ...file, games: next })
    return updated
  })
}

export async function removeGame(id: string): Promise<void> {
  await withFileLock(LOCK_KEY, async () => {
    const file = await readGamesFile()
    const game = file.games.find((item) => item.id === id)

    if (!game) return

    if (!isGameDeletable(game.status)) {
      throw new Error('Идущую игру нельзя удалить — сначала завершите её')
    }

    await writeJsonAtomic(gamesFile(), {
      ...file,
      games: file.games.filter((item) => item.id !== id)
    })
  })
}

/** Убирает ссылку на удалённую карту у всех игр. */
export async function clearMapReferences(mapId: string): Promise<void> {
  await withFileLock(LOCK_KEY, async () => {
    const file = await readGamesFile()
    let changed = false

    const games = file.games.map((game) => {
      if (game.mapId !== mapId) return game

      changed = true
      return {
        ...game,
        mapId: null,
        updatedAt: new Date().toISOString()
      }
    })

    if (!changed) return

    await writeJsonAtomic(gamesFile(), { ...file, games })
  })
}
