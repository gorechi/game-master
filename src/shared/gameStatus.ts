import { m } from './i18n'

/** Статусы игры и допустимые переходы между ними. */

export const GAME_STATUSES = ['new', 'running', 'paused', 'finished'] as const

export type GameStatus = (typeof GAME_STATUSES)[number]

/** Подпись статуса на языке активной локали. */
export function gameStatusLabel(status: GameStatus): string {
  return m().games.statuses[status]
}

/**
 * Подписи статусов для активной локали. Значения берутся при обращении,
 * поэтому строки не кешируются на уровне модуля.
 */
export const gameStatusLabels: Record<GameStatus, string> = {
  get new(): string {
    return gameStatusLabel('new')
  },
  get running(): string {
    return gameStatusLabel('running')
  },
  get paused(): string {
    return gameStatusLabel('paused')
  },
  get finished(): string {
    return gameStatusLabel('finished')
  }
}

const TRANSITIONS: Record<GameStatus, readonly GameStatus[]> = {
  new: ['running'],
  running: ['paused', 'finished'],
  paused: ['running', 'finished'],
  finished: []
}

export function isGameStatus(value: unknown): value is GameStatus {
  return typeof value === 'string' && (GAME_STATUSES as readonly string[]).includes(value)
}

export function canTransitionGame(from: GameStatus, to: GameStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

/** Редактировать можно всё, кроме завершённой игры. */
export function isGameEditable(status: GameStatus): boolean {
  return status !== 'finished'
}

/** Удалять можно только новую или завершённую игру. */
export function isGameDeletable(status: GameStatus): boolean {
  return status === 'new' || status === 'finished'
}
