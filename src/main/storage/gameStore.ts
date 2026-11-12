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
import { JsonFileError, readJsonFile, withFileLock, writeJsonAtomic } from './jsonFile'

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

function assertName(input: GameInput): GameInput {
  const name = input.name.trim()
  if (!name) {
    throw new Error('Название игры не может быть пустым')
  }
  return { name }
}

export async function listGames(): Promise<Game[]> {
  return (await readGamesFile()).games
}

export async function addGame(input: GameInput): Promise<Game> {
  const normalized = assertName(input)

  return withFileLock(LOCK_KEY, async () => {
    const file = await readGamesFile()
    const game = createGame(normalized)

    await writeJsonAtomic(gamesFile(), { ...file, games: [...file.games, game] })
    return game
  })
}

export async function updateGame(game: Game): Promise<Game> {
  const normalized = assertName(game)

  return withFileLock(LOCK_KEY, async () => {
    const file = await readGamesFile()
    const index = file.games.findIndex((item) => item.id === game.id)

    if (index === -1) {
      throw new Error('Игра не найдена — возможно, запись уже удалена')
    }

    const updated: Game = {
      ...file.games[index]!,
      name: normalized.name,
      updatedAt: new Date().toISOString()
    }

    const games = [...file.games]
    games[index] = updated

    await writeJsonAtomic(gamesFile(), { ...file, games })
    return updated
  })
}

export async function removeGame(id: string): Promise<void> {
  await withFileLock(LOCK_KEY, async () => {
    const file = await readGamesFile()
    const games = file.games.filter((item) => item.id !== id)

    if (games.length === file.games.length) return

    await writeJsonAtomic(gamesFile(), { ...file, games })
  })
}
