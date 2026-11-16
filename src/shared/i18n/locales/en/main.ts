// Main process messages: storage, IPC and the web preview.
export const enMainMessages = {
  jsonFile: {
    notFound: 'File not found',
    readFailed: 'Failed to read the file: {error}',
    invalidJson: 'The file is corrupted: invalid JSON'
  },
  ipc: {
    invalidId: 'Invalid identifier',
    invalidPlayer: 'Invalid player data',
    invalidSettings: 'Invalid settings',
    invalidTheme: 'Invalid appearance theme',
    invalidLocale: 'Invalid interface language',
    invalidMonsterList: 'Invalid monster list',
    invalidGameStatus: 'Invalid game status',
    openFolderFailed: 'Failed to open the folder: {error}'
  },
  players: {
    readFailed: 'Failed to read the player database: {error}',
    corrupted: 'The player database file is corrupted and cannot be read',
    nameRequired: 'Player name cannot be empty',
    notFound: 'Player not found — the record may have been deleted'
  },
  characters: {
    readFailed: 'Failed to read the character database: {error}',
    corrupted: 'The character database file is corrupted and cannot be read',
    nameRequired: 'Character name cannot be empty',
    notFound: 'Character not found — the record may have been deleted'
  },
  monsters: {
    readFailed: 'Failed to read the bestiary: {error}',
    corrupted: 'The bestiary file is corrupted and cannot be read',
    nameRequired: 'Monster name cannot be empty',
    notFound: 'Monster not found — the record may have been deleted'
  },
  maps: {
    readFailed: 'Failed to read the maps: {error}',
    corrupted: 'The maps file is corrupted and cannot be read',
    nameRequired: 'Map name cannot be empty',
    notFound: 'Map not found — the record may have been deleted'
  },
  realms: {
    readFailed: 'Failed to read the realms: {error}',
    corrupted: 'The realms file is corrupted and cannot be read',
    nameRequired: 'Realm name cannot be empty',
    notFound: 'Realm not found — it may have been deleted',
    recordNotFound: 'Realm not found — the record may have been deleted',
    lastRemovalForbidden: 'Cannot delete the last realm',
    notEmpty:
      'The realm contains games, characters, monsters, maps, or place icons — delete them first',
    seedDescription:
      'The base fantasy realm. Data created before realms were introduced goes here.'
  },
  games: {
    readFailed: 'Failed to read the games list: {error}',
    corrupted: 'The games file is corrupted and cannot be read',
    nameRequired: 'Game name cannot be empty',
    notFound: 'Game not found — the record may have been deleted',
    editForbidden: 'A finished game cannot be edited',
    finishThroughScreen: 'Finish the game through the finish screen',
    invalidStatusTransition: 'This status transition is not allowed',
    finishNotAllowed: 'Only a running or paused game can be finished',
    deleteRunningForbidden: 'A running game cannot be deleted — finish it first'
  },
  gameMonsters: {
    readFailed: 'Failed to read the game monsters list: {error}',
    corrupted: 'The game monsters file is corrupted and cannot be read',
    notFound: 'Saved monster not found — the record may have been deleted'
  },
  placeTypes: {
    readFailed: 'Failed to read the place icons: {error}',
    corrupted: 'The place icons file is corrupted and cannot be read',
    iconInvalid: 'The icon does not meet the requirements: {problems}',
    notFound: 'Icon not found — the record may have been deleted'
  },
  preview: {
    storageLabel: 'Browser localStorage'
  }
}
