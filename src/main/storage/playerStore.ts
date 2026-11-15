import path from 'node:path'
import { app } from 'electron'
import { createPlayer, normalizePlayerInput } from '@shared/domain'
import {
  PLAYERS_FILE_SCHEMA_VERSION,
  playersFileSchema,
  type Player,
  type PlayerInput,
  type PlayersFile
} from '@shared/player'
import { JsonFileError, readJsonFile, withFileLock, writeJsonAtomic } from './jsonFile'

const LOCK_KEY = 'players.json'

/**
 * Вся база игроков — один файл в userData. Игроков десятки, а не тысячи,
 * поэтому отдельные файлы на каждого только усложнили бы миграции и бэкапы.
 */
function playersFile(): string {
  return path.join(app.getPath('userData'), 'players.json')
}

function emptyFile(): PlayersFile {
  return { schemaVersion: PLAYERS_FILE_SCHEMA_VERSION, players: [] }
}

async function readPlayersFile(): Promise<PlayersFile> {
  let raw: unknown

  try {
    raw = await readJsonFile(playersFile())
  } catch (error) {
    if (error instanceof JsonFileError && error.code === 'ENOENT') {
      return emptyFile()
    }
    throw new Error(`Не удалось прочитать базу игроков: ${(error as Error).message}`)
  }

  const parsed = playersFileSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error('Файл базы игроков повреждён и не может быть прочитан')
  }

  return parsed.data
}

function assertName(input: PlayerInput): PlayerInput {
  const normalized = normalizePlayerInput(input)
  if (!normalized.firstName) {
    throw new Error('Имя игрока не может быть пустым')
  }
  return normalized
}

export async function listPlayers(): Promise<Player[]> {
  return (await readPlayersFile()).players
}

export async function addPlayer(input: PlayerInput): Promise<Player> {
  const normalized = assertName(input)

  return withFileLock(LOCK_KEY, async () => {
    const file = await readPlayersFile()
    const player = createPlayer(normalized)

    await writeJsonAtomic(playersFile(), {
      ...file,
      players: [...file.players, player]
    })

    return player
  })
}

export async function updatePlayer(player: Player): Promise<Player> {
  const normalized = assertName(player)

  return withFileLock(LOCK_KEY, async () => {
    const file = await readPlayersFile()
    const index = file.players.findIndex((item) => item.id === player.id)

    if (index === -1) {
      throw new Error('Игрок не найден — возможно, запись уже удалена')
    }

    const updated: Player = {
      ...file.players[index]!,
      firstName: normalized.firstName,
      lastName: normalized.lastName,
      updatedAt: new Date().toISOString()
    }

    const players = [...file.players]
    players[index] = updated

    await writeJsonAtomic(playersFile(), { ...file, players })
    return updated
  })
}

export async function removePlayer(id: string): Promise<void> {
  await withFileLock(LOCK_KEY, async () => {
    const file = await readPlayersFile()
    const players = file.players.filter((item) => item.id !== id)

    if (players.length === file.players.length) return

    await writeJsonAtomic(playersFile(), { ...file, players })
  })
}
