import { appMessages } from './app'
import { backupMessages } from './backup'
import { bestiaryMessages } from './bestiary'
import { dataMessages } from './data'
import { dataPackMessages } from './dataPack'
import { gamesMessages } from './games'
import { mainMessages } from './main'
import { mapsMessages } from './maps'
import { peopleMessages } from './people'
import { realmsMessages } from './realms'
import { settingsMessages } from './settings'
import { sidebarMessages } from './sidebar'
import { uiMessages } from './ui'
import { updatesMessages } from './updates'
import { validationMessages } from './validation'

/**
 * Русская локаль. Разбита по разделам приложения: так проще поддерживать
 * и переводить, а общий объект собирается здесь.
 */
export const ru = {
  app: appMessages,
  ui: uiMessages,
  sidebar: sidebarMessages,
  settings: settingsMessages,
  updates: updatesMessages,
  data: dataMessages,
  backup: backupMessages,
  games: gamesMessages,
  maps: mapsMessages,
  people: peopleMessages,
  bestiary: bestiaryMessages,
  realms: realmsMessages,
  validation: validationMessages,
  dataPack: dataPackMessages,
  main: mainMessages
}
