import type { GameMasterApi } from '@shared/api'

declare global {
  interface Window {
    gameMaster: GameMasterApi
  }
}

export {}
