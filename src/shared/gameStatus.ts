/** Статусы игры и допустимые переходы между ними. */

export const GAME_STATUSES = ['new', 'running', 'paused', 'finished'] as const

export type GameStatus = (typeof GAME_STATUSES)[number]

export const gameStatusLabels: Record<GameStatus, string> = {
  new: 'Новая',
  running: 'Проводится',
  paused: 'На паузе',
  finished: 'Закончена'
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
