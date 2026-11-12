import type {
  Campaign,
  CampaignSummary,
  Character,
  CharacterKind,
  Combatant,
  Encounter
} from './campaign'
import type { Player, PlayerInput } from './player'
import type { CharacterProfile, CharacterProfileInput } from './characterProfile'

/**
 * Доменный слой без зависимостей: фабрики, подписи и сводки.
 * Импортируется и renderer'ом, и main — поэтому здесь не должно быть zod
 * (схемы валидации живут в campaign.ts и грузятся только в main).
 */

/**
 * Версия формата файла кампании.
 * Увеличивается при несовместимых изменениях схемы — см. migrateCampaign().
 */
export const CAMPAIGN_SCHEMA_VERSION = 1

export const CHARACTER_KINDS: readonly CharacterKind[] = ['pc', 'npc', 'monster']

export const characterKindLabels: Record<CharacterKind, string> = {
  pc: 'Персонаж игрока',
  npc: 'NPC',
  monster: 'Монстр'
}

export function createEmptyEncounter(): Encounter {
  return {
    id: campaignElementId(),
    name: 'Бой',
    status: 'idle',
    round: 1,
    activeId: null,
    combatants: []
  }
}

export function createEmptyCampaign(name: string, id: string = crypto.randomUUID()): Campaign {
  const now = new Date().toISOString()

  return {
    schemaVersion: CAMPAIGN_SCHEMA_VERSION,
    id,
    name,
    createdAt: now,
    updatedAt: now,
    notes: '',
    characters: [],
    encounter: createEmptyEncounter()
  }
}

export function createCharacter(
  input: Partial<Omit<Character, 'id'>> & Pick<Character, 'name'>
): Character {
  return {
    id: campaignElementId(),
    name: input.name,
    kind: input.kind ?? 'pc',
    subtitle: input.subtitle ?? '',
    initiativeBonus: input.initiativeBonus ?? 0,
    armorClass: input.armorClass ?? null,
    maxHp: input.maxHp ?? null,
    notes: input.notes ?? ''
  }
}

export function createCombatant(
  input: Partial<Omit<Combatant, 'id'>> & Pick<Combatant, 'name'>
): Combatant {
  return {
    id: campaignElementId(),
    characterId: input.characterId ?? null,
    name: input.name,
    initiative: input.initiative ?? null,
    initiativeBonus: input.initiativeBonus ?? 0,
    armorClass: input.armorClass ?? null,
    hpCurrent: input.hpCurrent ?? input.hpMax ?? null,
    hpMax: input.hpMax ?? null,
    conditions: input.conditions ?? [],
    notes: input.notes ?? '',
    isPlayer: input.isPlayer ?? false
  }
}

export function combatantFromCharacter(character: Character): Combatant {
  return createCombatant({
    characterId: character.id,
    name: character.name,
    initiativeBonus: character.initiativeBonus,
    armorClass: character.armorClass,
    hpCurrent: character.maxHp,
    hpMax: character.maxHp,
    isPlayer: character.kind === 'pc'
  })
}

/** Короткий id, достаточный для уникальности внутри файла кампании. */
export function campaignElementId(): string {
  return crypto.randomUUID().slice(0, 8)
}

export function summarizeCampaign(campaign: Campaign): CampaignSummary {
  return {
    id: campaign.id,
    name: campaign.name.trim() || 'Без названия',
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    playerCount: campaign.characters.filter((c) => c.kind === 'pc').length,
    combatantCount: campaign.encounter.combatants.length,
    problem: null
  }
}

export function summarizeBrokenCampaign(id: string, problem: string): CampaignSummary {
  return {
    id,
    name: 'Повреждённый файл',
    createdAt: '',
    updatedAt: '',
    playerCount: 0,
    combatantCount: 0,
    problem
  }
}

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
