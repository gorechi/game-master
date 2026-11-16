import { enAppMessages } from './app'
import { enBackupMessages } from './backup'
import { enBestiaryMessages } from './bestiary'
import { enDataMessages } from './data'
import { enDataPackMessages } from './dataPack'
import { enGamesMessages } from './games'
import { enMainMessages } from './main'
import { enMapsMessages } from './maps'
import { enPeopleMessages } from './people'
import { enRealmsMessages } from './realms'
import { enSettingsMessages } from './settings'
import { enSidebarMessages } from './sidebar'
import { enUiMessages } from './ui'
import { enUpdatesMessages } from './updates'
import { enValidationMessages } from './validation'

/** English locale, split by application section. */
export const en = {
  app: enAppMessages,
  ui: enUiMessages,
  sidebar: enSidebarMessages,
  settings: enSettingsMessages,
  updates: enUpdatesMessages,
  data: enDataMessages,
  backup: enBackupMessages,
  games: enGamesMessages,
  maps: enMapsMessages,
  people: enPeopleMessages,
  bestiary: enBestiaryMessages,
  realms: enRealmsMessages,
  validation: enValidationMessages,
  dataPack: enDataPackMessages,
  main: enMainMessages
}
