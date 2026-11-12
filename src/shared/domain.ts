import type { Player, PlayerInput } from './player'
import type { CharacterProfile, CharacterProfileInput } from './characterProfile'

/**
 * Доменный слой без зависимостей: фабрики, подписи и сводки.
 * Импортируется и renderer'ом, и main — поэтому здесь не должно быть zod
 * (схемы валидации живут в player.ts и characterProfile.ts и грузятся только в main).
 */

/* ------------------------------------------------------------------ */
/* Игроки (люди за столом)                                            */
/* ------------------------------------------------------------------ */

export function normalizePlayerInput(input: PlayerInput): PlayerInput {
  return {
    firstName: input.firstName.trim().slice(0, 100),
    lastName: input.lastName.trim().slice(0, 100)
  }
}

export function createPlayer(input: PlayerInput, id: string = crypto.randomUUID()): Player {
  const normalized = normalizePlayerInput(input)
  const now = new Date().toISOString()

  return {
    id,
    firstName: normalized.firstName,
    lastName: normalized.lastName,
    createdAt: now,
    updatedAt: now
  }
}

export function playerFullName(player: Pick<Player, 'firstName' | 'lastName'>): string {
  return [player.firstName, player.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
}

export function playerInitials(player: Pick<Player, 'firstName' | 'lastName'>): string {
  const first = player.firstName.trim().charAt(0)
  const last = player.lastName.trim().charAt(0)
  return `${first}${last}`.toUpperCase() || '?'
}

/* ------------------------------------------------------------------ */
/* Персонажи-карточки (герои игроков)                                 */
/* ------------------------------------------------------------------ */

export type NormalizedCharacterProfileInput = Omit<CharacterProfileInput, 'level'> & {
  level: number
}

/** Уровень героя 1–20; пустое или некорректное значение становится 1. */
export function clampCharacterLevel(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 1
  return Math.min(20, Math.max(1, Math.round(value)))
}

export function normalizeCharacterProfileInput(
  input: CharacterProfileInput
): NormalizedCharacterProfileInput {
  return {
    playerId: input.playerId || null,
    name: input.name.trim().slice(0, 80),
    className: input.className.trim().slice(0, 60),
    race: input.race.trim().slice(0, 60),
    statuses: [...new Set(input.statuses.map((status) => status.trim()).filter(Boolean))].slice(
      0,
      16
    ),
    image: input.image ?? null,
    level: clampCharacterLevel(input.level)
  }
}

export function createCharacterProfile(
  input: CharacterProfileInput,
  id: string = crypto.randomUUID()
): CharacterProfile {
  const now = new Date().toISOString()

  return {
    id,
    ...normalizeCharacterProfileInput(input),
    createdAt: now,
    updatedAt: now
  }
}
