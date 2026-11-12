import type { GameMasterApi } from '@shared/api'

declare global {
  interface Window {
    /** Есть только в Electron. В браузере отсутствует — см. lib/api.ts. */
    gameMaster?: GameMasterApi
  }
}

export {}
