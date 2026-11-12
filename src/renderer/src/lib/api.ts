import type { GameMasterApi } from '@shared/api'

/** Типизированный доступ к мосту preload → main. */
export const api: GameMasterApi = window.gameMaster

/**
 * Electron оборачивает ошибки IPC в «Error invoking remote method 'x': Error: ...».
 * Для UI оставляем только человекочитаемую часть.
 */
export function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  return raw.replace(/^Error invoking remote method '[^']*':\s*(Error:\s*)?/, '')
}
