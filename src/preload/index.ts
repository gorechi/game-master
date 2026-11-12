import { contextBridge, ipcRenderer } from 'electron'
import type { GameMasterApi } from '@shared/api'
import { IPC } from '@shared/api'

const api: GameMasterApi = {
  app: {
    info: () => ipcRenderer.invoke(IPC.appInfo),
    openDataFolder: () => ipcRenderer.invoke(IPC.appOpenDataFolder)
  },
  games: {
    list: () => ipcRenderer.invoke(IPC.gamesList),
    create: (input) => ipcRenderer.invoke(IPC.gameCreate, input),
    update: (game) => ipcRenderer.invoke(IPC.gameUpdate, game),
    remove: (id) => ipcRenderer.invoke(IPC.gameRemove, id)
  },
  players: {
    list: () => ipcRenderer.invoke(IPC.playersList),
    create: (input) => ipcRenderer.invoke(IPC.playerCreate, input),
    update: (player) => ipcRenderer.invoke(IPC.playerUpdate, player),
    remove: (id) => ipcRenderer.invoke(IPC.playerRemove, id)
  },
  characters: {
    list: () => ipcRenderer.invoke(IPC.charactersList),
    create: (input) => ipcRenderer.invoke(IPC.characterCreate, input),
    update: (profile) => ipcRenderer.invoke(IPC.characterUpdate, profile),
    remove: (id) => ipcRenderer.invoke(IPC.characterRemove, id)
  },
  monsters: {
    list: () => ipcRenderer.invoke(IPC.monstersList),
    create: (input) => ipcRenderer.invoke(IPC.monsterCreate, input),
    update: (monster) => ipcRenderer.invoke(IPC.monsterUpdate, monster),
    remove: (id) => ipcRenderer.invoke(IPC.monsterRemove, id)
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC.settingsGet),
    update: (patch) => ipcRenderer.invoke(IPC.settingsUpdate, patch)
  }
}

contextBridge.exposeInMainWorld('gameMaster', api)
