export const enBackupMessages = {
  frequencies: {
    off: 'No automatic backup',
    onClose: 'Every time the app closes',
    daily: 'Once a day',
    every2Days: 'Once every two days',
    every3Days: 'Once every three days'
  },
  panel: {
    manualTitle: 'Manual backup',
    manualDescription:
      'A full copy of user data: games, players, characters, monsters, maps, realms, icons, theme and language.',
    create: 'Create and download a backup',
    creating: 'Creating a backup…',
    savedNotice: 'File saved: {fileName}. In the backup: {counts}.',
    restoreTitle: 'Load a backup',
    restoreDescription:
      'Before replacing, the current data will be saved to a separate file.',
    restoredNotice: 'Data restored. Backup of the current state: {fileName}',
    refreshFailed:
      'Data restored, but the interface could not be refreshed: {error}',
    dropTitle: 'Choose a .{extension} file',
    dropHint: 'or drag it here',
    backupFrom: 'Backup from {date}',
    backupFromWithVersion: 'Backup from {date} · version {version}',
    remove: 'Remove',
    restoring: 'Restoring…',
    restore: 'Restore backup',
    autoTitle: 'Automatic backup',
    autoDescription:
      'The app saves copies to the selected folder and keeps the last {count} automatic backups.',
    folderLabel: 'Backup folder',
    chooseFolder: 'Choose folder',
    frequencyLabel: 'When to make a backup',
    frequencyAriaLabel: 'Automatic backup frequency',
    webPreviewNote:
      'In the web preview, automatic backup does not write files to disk.',
    lastBackupLabel: 'Last automatic backup',
    errorLabel: 'Error',
    confirmTitle: 'Replace all data?',
    confirmDescription:
      'The current games, players, characters, monsters, maps, realms, icons and theme will be replaced with the contents of the backup. Before replacing, the app will save the current state to a separate file.',
    confirmCancel: 'Cancel',
    confirmRestore: 'Restore',
    neverRun: 'Not run yet',
    noUserData: 'No user data',
    plural: {
      games: {
        one: '{count} game',
        other: '{count} games'
      },
      maps: {
        one: '{count} map',
        other: '{count} maps'
      },
      monsters: {
        one: '{count} monster',
        other: '{count} monsters'
      },
      uniqueMonsters: {
        one: '{count} unique creature',
        other: '{count} unique creatures'
      },
      characters: {
        one: '{count} character',
        other: '{count} characters'
      },
      players: {
        one: '{count} player',
        other: '{count} players'
      },
      realms: {
        one: '{count} realm',
        other: '{count} realms'
      },
      placeTypes: {
        one: '{count} icon',
        other: '{count} icons'
      }
    },
    errors: {
      tooLarge: 'The backup file is too large',
      notJson: 'The file is corrupted: there is no JSON inside',
      invalidBackup:
        'The file is not a valid Game Master backup{where}: {reason}',
      unknown: 'unknown error'
    }
  },
  validation: {
    realmRequired: 'The backup must contain at least one realm',
    duplicateRealmIds: 'The backup contains duplicate realm ids',
    duplicatePlaceTypeIds: 'The backup contains duplicate icon ids',
    duplicateMonsterIds: 'The backup contains duplicate monster ids',
    duplicateUniqueMonsterIds:
      'The backup contains duplicate unique creature ids',
    duplicateMapIds: 'The backup contains duplicate map ids',
    duplicateGameIds: 'The backup contains duplicate game ids',
    duplicatePlayerIds: 'The backup contains duplicate player ids',
    duplicateCharacterIds: 'The backup contains duplicate character ids',
    missingRealm: 'A record references a realm that is not in the backup',
    gameMapMissing: 'The game references a map that is not in this realm',
    placementMissingMonster:
      'A placement references a monster that is not in the game',
    duplicatePlacement: 'The monster has several placements in the same game',
    placementMissingMap: 'A placement references an unavailable map',
    placementMissingPlace:
      'A placement references a place that is not on the map',
    defeatedMissingMonster: 'A defeated monster is missing from the game',
    duplicateDefeatedMonster: 'A defeated monster is listed more than once',
    duplicatePlaceIds: 'The map has places with the same ids',
    placeMissingIcon: 'A place references an icon that is not in this realm',
    placeMissingMap: 'A place references an unavailable map',
    pathMissingPlace: 'A map path references a place that does not exist'
  },
  service: {
    dialogs: {
      saveTitle: 'Save Game Master backup',
      openTitle: 'Load Game Master backup',
      folderTitle: 'Automatic backup folder',
      filterName: 'Game Master backup'
    },
    errors: {
      tooLarge: 'The backup file is too large',
      notJson: 'The file is corrupted: there is no JSON inside',
      invalidBackup:
        'The file is not a valid Game Master backup{where}: {reason}',
      unknown: 'unknown error',
      invalidRestoreRequest: 'Invalid restore request',
      pathNotFolder: 'The selected path is not a folder',
      invalidSettings: 'Invalid backup settings',
      folderRequired: 'Choose a folder for backups',
      invalidFrequency: 'Invalid automatic backup frequency'
    }
  }
}
