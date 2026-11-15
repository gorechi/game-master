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
    create: (input, realmId) => ipcRenderer.invoke(IPC.gameCreate, input, realmId),
    update: (game) => ipcRenderer.invoke(IPC.gameUpdate, game),
    remove: (id) => ipcRenderer.invoke(IPC.gameRemove, id),
    finish: (id, keepMonsterIds) => ipcRenderer.invoke(IPC.gameFinish, id, keepMonsterIds),
    setStatus: (id, status) => ipcRenderer.invoke(IPC.gameSetStatus, id, status)
  },
  gameMonsters: {
    list: () => ipcRenderer.invoke(IPC.gameMonstersList),
    create: (input, realmId) => ipcRenderer.invoke(IPC.gameMonsterCreate, input, realmId),
    update: (entry) => ipcRenderer.invoke(IPC.gameMonsterUpdate, entry),
    remove: (id) => ipcRenderer.invoke(IPC.gameMonsterRemove, id)
  },
  players: {
    list: () => ipcRenderer.invoke(IPC.playersList),
    create: (input) => ipcRenderer.invoke(IPC.playerCreate, input),
    update: (player) => ipcRenderer.invoke(IPC.playerUpdate, player),
    remove: (id) => ipcRenderer.invoke(IPC.playerRemove, id)
  },
  characters: {
    list: () => ipcRenderer.invoke(IPC.charactersList),
    create: (input, realmId) => ipcRenderer.invoke(IPC.characterCreate, input, realmId),
    update: (profile) => ipcRenderer.invoke(IPC.characterUpdate, profile),
    remove: (id) => ipcRenderer.invoke(IPC.characterRemove, id)
  },
  monsters: {
    list: () => ipcRenderer.invoke(IPC.monstersList),
    create: (input, realmId) => ipcRenderer.invoke(IPC.monsterCreate, input, realmId),
    update: (monster) => ipcRenderer.invoke(IPC.monsterUpdate, monster),
    remove: (id) => ipcRenderer.invoke(IPC.monsterRemove, id)
  },
  maps: {
    list: (realmId) => ipcRenderer.invoke(IPC.mapsList, realmId),
    create: (input) => ipcRenderer.invoke(IPC.mapCreate, input),
    update: (map) => ipcRenderer.invoke(IPC.mapUpdate, map),
    remove: (id) => ipcRenderer.invoke(IPC.mapRemove, id)
  },
  realms: {
    list: () => ipcRenderer.invoke(IPC.realmsList),
    create: (input) => ipcRenderer.invoke(IPC.realmCreate, input),
    update: (realm) => ipcRenderer.invoke(IPC.realmUpdate, realm),
    remove: (id) => ipcRenderer.invoke(IPC.realmRemove, id)
  },
  placeTypes: {
    list: (realmId) => ipcRenderer.invoke(IPC.placeTypesList, realmId),
    create: (input, realmId) => ipcRenderer.invoke(IPC.placeTypeCreate, input, realmId),
    update: (placeType) => ipcRenderer.invoke(IPC.placeTypeUpdate, placeType),
    remove: (id) => ipcRenderer.invoke(IPC.placeTypeRemove, id)
  },
  data: {
    exportPackage: (request) => ipcRenderer.invoke(IPC.dataExport, request),
    chooseImportFile: () => ipcRenderer.invoke(IPC.dataChooseImportFile),
    importPackage: (request) => ipcRenderer.invoke(IPC.dataImport, request)
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC.settingsGet),
    update: (patch) => ipcRenderer.invoke(IPC.settingsUpdate, patch)
  }
}

contextBridge.exposeInMainWorld('gameMaster', api)
