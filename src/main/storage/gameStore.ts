import path from 'node:path'
import { app } from 'electron'
import { createGame } from '@shared/domain'
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
import { saveGameMonsters } from './gameMonsterStore'

const LOCK_KEY = 'games.json'

export function gamesFile(): string {
  return path.join(app.getPath('userData'), 'games.json')
}

function emptyFile(): GamesFile {
  return { schemaVersion: GAMES_FILE_SCHEMA_VERSION, games: [] }
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

  const parsed = gamesFileSchema.safeParse(raw)
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
    characterIds: [...new Set(input.characterIds)],
    monsters: input.monsters
  }
}

export async function listGames(): Promise<Game[]> {
  return (await readGamesFile()).games
}

export async function addGame(input: GameInput): Promise<Game> {
  const normalized = assertGame(input)

  return withFileLock(LOCK_KEY, async () => {
    const file = await readGamesFile()
    const game = createGame(normalized)

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

export async function removeGame(  id: string,
  keepMonsterIds: readonly string[] = []
): Promise<void> {
  const games = await readGamesFile()
  const game = games.games.find((item) => item.id === id)

  if (!game) return

  if (!isGameDeletable(game.status)) {
    throw new Error('Идущую игру нельзя удалить — сначала завершите её')
  }

  if (keepMonsterIds.length > 0) {
    const keep = new Set(keepMonsterIds)
    const savedAt = new Date().toISOString()

    const kept: GameMonsterEntry[] = game.monsters
      .filter((monster) => keep.has(monster.id))
      .map((monster) => ({
        ...monster,
        savedFromGameId: game.id,
        savedAt
      }))

    await saveGameMonsters(kept)
  }

  await withFileLock(LOCK_KEY, async () => {
    const file = await readGamesFile()
    const remaining = file.games.filter((item) => item.id !== id)

    if (remaining.length === file.games.length) return

    await writeJsonAtomic(gamesFile(), { ...file, games: remaining })
  })
}
