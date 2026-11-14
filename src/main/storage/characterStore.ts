import path from 'node:path'
import { app } from 'electron'
import { createCharacterProfile, normalizeCharacterProfileInput } from '@shared/domain'
import { DEFAULT_REALM_ID } from '@shared/realm'
import type { NormalizedCharacterProfileInput } from '@shared/domain'
import {
  CHARACTERS_FILE_SCHEMA_VERSION,
  charactersFileSchema,
  type CharacterProfile,
  type CharacterProfileInput,
  type CharactersFile
} from '@shared/characterProfile'
import { JsonFileError, readJsonFile, withFileLock, writeJsonAtomic } from './jsonFile'

const LOCK_KEY = 'characters.json'

export function charactersFile(): string {
  return path.join(app.getPath('userData'), 'characters.json')
}

function emptyFile(): CharactersFile {
  return { schemaVersion: CHARACTERS_FILE_SCHEMA_VERSION, characters: [] }
}

async function readCharactersFile(): Promise<CharactersFile> {
  let raw: unknown

  try {
    raw = await readJsonFile(charactersFile())
  } catch (error) {
    if (error instanceof JsonFileError && error.code === 'ENOENT') {
      return emptyFile()
    }
    throw new Error(`Не удалось прочитать базу персонажей: ${(error as Error).message}`)
  }

  const parsed = charactersFileSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error('Файл базы персонажей повреждён и не может быть прочитан')
  }

  return parsed.data
}

function assertName(input: CharacterProfileInput): NormalizedCharacterProfileInput {
  const normalized = normalizeCharacterProfileInput(input)
  if (!normalized.name) {
    throw new Error('Имя персонажа не может быть пустым')
  }
  return normalized
}

export async function listCharacters(realmId?: string): Promise<CharacterProfile[]> {
  const characters = (await readCharactersFile()).characters
  return realmId
    ? characters.filter((character) => character.realmId === realmId)
    : characters
}

export async function addCharacter(
  input: CharacterProfileInput,
  realmId: string = DEFAULT_REALM_ID
): Promise<CharacterProfile> {
  const normalized = assertName(input)

  return withFileLock(LOCK_KEY, async () => {
    const file = await readCharactersFile()
    const character = createCharacterProfile(normalized, realmId)

    await writeJsonAtomic(charactersFile(), {
      ...file,
      characters: [...file.characters, character]
    })

    return character
  })
}

export async function updateCharacter(profile: CharacterProfile): Promise<CharacterProfile> {
  const normalized = assertName(profile)

  return withFileLock(LOCK_KEY, async () => {
    const file = await readCharactersFile()
    const index = file.characters.findIndex((item) => item.id === profile.id)

    if (index === -1) {
      throw new Error('Персонаж не найден — возможно, запись уже удалена')
    }

    const updated: CharacterProfile = {
      ...file.characters[index]!,
      ...normalized,
      updatedAt: new Date().toISOString()
    }

    const characters = [...file.characters]
    characters[index] = updated

    await writeJsonAtomic(charactersFile(), { ...file, characters })
    return updated
  })
}

export async function removeCharacter(id: string): Promise<void> {
  await withFileLock(LOCK_KEY, async () => {
    const file = await readCharactersFile()
    const characters = file.characters.filter((item) => item.id !== id)

    if (characters.length === file.characters.length) return

    await writeJsonAtomic(charactersFile(), { ...file, characters })
  })
}
