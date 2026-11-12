import { contextBridge, ipcRenderer } from 'electron'
import type { GameMasterApi } from '@shared/api'
import { IPC } from '@shared/api'

const api: GameMasterApi = {
  app: {
    info: () => ipcRenderer.invoke(IPC.appInfo),
    openDataFolder: () => ipcRenderer.invoke(IPC.appOpenDataFolder),
    onBeforeClose: (listener) => {
      const handler = (): void => listener()
      ipcRenderer.on(IPC.appBeforeClose, handler)
      return () => ipcRenderer.removeListener(IPC.appBeforeClose, handler)
    },
    closeReady: () => ipcRenderer.send(IPC.appCloseReady)
  },
  campaigns: {
    list: () => ipcRenderer.invoke(IPC.campaignsList),
    create: (input) => ipcRenderer.invoke(IPC.campaignCreate, input),
    load: (id) => ipcRenderer.invoke(IPC.campaignLoad, id),
    save: (campaign) => ipcRenderer.invoke(IPC.campaignSave, campaign),
    remove: (id) => ipcRenderer.invoke(IPC.campaignRemove, id),
    reveal: (id) => ipcRenderer.invoke(IPC.campaignReveal, id)
  },
  players: {
    list: () => ipcRenderer.invoke(IPC.playersList),
    create: (input) => ipcRenderer.invoke(IPC.playerCreate, input),
    update: (player) => ipcRenderer.invoke(IPC.playerUpdate, player),
    remove: (id) => ipcRenderer.invoke(IPC.playerRemove, id)
  }
}

contextBridge.exposeInMainWorld('gameMaster', api)
