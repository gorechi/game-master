import type { Combatant, Encounter } from './campaign'

/** Частые состояния 5e — быстрые чипы в трекере боя. */
export const CONDITIONS = [
  'Ослеплён',
  'Оглушён',
  'Испуган',
  'Захвачен',
  'Отравлен',
  'Сбит с ног',
  'Ошеломлён',
  'Парализован',
  'Окаменел',
  'Недееспособен',
  'Горит',
  'Кровотечение',
  'Невидим',
  'Ускорен',
  'Замедлен',
  'Сосредоточение'
] as const

export type Condition = (typeof CONDITIONS)[number]

/** Бросок d20. rng внедряется для тестов. */
export function rollD20(rng: () => number = Math.random): number {
  return Math.floor(rng() * 20) + 1
}

export function rollInitiative(bonus: number, rng: () => number = Math.random): number {
  return rollD20(rng) + bonus
}

/**
 * Порядок хода: инициатива по убыванию, при равенстве — больший бонус,
 * затем имя. Не бросившие инициативу всегда в конце.
 */
export function sortCombatants(combatants: readonly Combatant[]): Combatant[] {
  return [...combatants].sort((a, b) => {
    const aInit = a.initiative ?? Number.NEGATIVE_INFINITY
    const bInit = b.initiative ?? Number.NEGATIVE_INFINITY

    if (aInit !== bInit) return bInit - aInit
    if (a.initiativeBonus !== b.initiativeBonus) return b.initiativeBonus - a.initiativeBonus
    return a.name.localeCompare(b.name, 'ru')
  })
}

/** Начинает бой с первого участника в порядке инициативы. */
export function startEncounter(encounter: Encounter): Encounter {
  const order = sortCombatants(encounter.combatants)
  const first = order[0]

  if (!first) return encounter

  return { ...encounter, status: 'running', round: 1, activeId: first.id }
}

/** Передаёт ход следующему участнику, с новым раундом после последнего. */
export function advanceTurn(encounter: Encounter): Encounter {
  const order = sortCombatants(encounter.combatants)
  if (order.length === 0) return encounter

  if (encounter.status !== 'running' || !encounter.activeId) {
    return startEncounter(encounter)
  }

  const currentIndex = order.findIndex((c) => c.id === encounter.activeId)
  if (currentIndex === -1) {
    return startEncounter(encounter)
  }

  const nextIndex = currentIndex + 1
  if (nextIndex >= order.length) {
    const first = order[0]!
    return { ...encounter, activeId: first.id, round: encounter.round + 1 }
  }

  return { ...encounter, activeId: order[nextIndex]!.id }
}

/** Возвращает ход назад — удобно, если мастер промахнулся кнопкой. */
export function rewindTurn(encounter: Encounter): Encounter {
  const order = sortCombatants(encounter.combatants)
  if (order.length === 0) return encounter

  const currentIndex = encounter.activeId
    ? order.findIndex((c) => c.id === encounter.activeId)
    : -1

  if (currentIndex <= 0) {
    const last = order[order.length - 1]!
    return { ...encounter, status: 'running', round: Math.max(1, encounter.round), activeId: last.id }
  }

  return { ...encounter, status: 'running', activeId: order[currentIndex - 1]!.id }
}

export function stopEncounter(encounter: Encounter): Encounter {
  return { ...encounter, status: 'idle', round: 1, activeId: null }
}

/** Смена инициативы у участника не должна ломать текущий ход. */
export function updateCombatant(
  encounter: Encounter,
  combatantId: string,
  patch: Partial<Omit<Combatant, 'id'>>
): Encounter {
  return {
    ...encounter,
    combatants: encounter.combatants.map((c) =>
      c.id === combatantId ? { ...c, ...patch } : c
    )
  }
}

export function clampHp(combatant: Combatant, delta: number): Combatant {
  if (combatant.hpCurrent === null) return combatant

  const max = combatant.hpMax ?? Number.POSITIVE_INFINITY
  const next = Math.min(max, Math.max(0, combatant.hpCurrent + delta))

  return { ...combatant, hpCurrent: next }
}
