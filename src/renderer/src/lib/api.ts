import type { GameMasterApi } from '@shared/api'
import { createWebBridge } from './webBridge'

const bridge: GameMasterApi | undefined = window.gameMaster

/** true, если интерфейс открыт в обычном браузере (веб-предпросмотр без Electron). */
export const isWebPreview = !bridge

/**
 * Типизированный доступ к бэкенду.
 * В Electron — мост preload → main; в браузере — локальный веб-адаптер.
 */
export const api: GameMasterApi = bridge ?? createWebBridge()

/**
 * Electron оборачивает ошибки IPC в «Error invoking remote method 'x': Error: ...».
 * Для UI оставляем только человекочитаемую часть.
 */
export function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  return raw.replace(/^Error invoking remote method '[^']*':\s*(Error:\s*)?/, '')
}
