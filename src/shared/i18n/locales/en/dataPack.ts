// Messages for data pack import and export.
export const enDataPackMessages = {
  kindLabels: {
    games: 'Games',
    maps: 'Maps',
    monsters: 'Monsters',
    uniqueMonsters: 'Unique creatures',
    realm: 'Realm'
  },
  entityTitles: {
    game: 'Game',
    map: 'Map',
    monster: 'Monster',
    uniqueMonster: 'Unique creature'
  },
  dialogs: {
    exportTitle: 'Export Game Master data',
    importTitle: 'Import Game Master data',
    filterName: 'Game Master pack'
  },
  errors: {
    invalidExportRequest: 'Invalid export request',
    unknownExportKind: 'Unknown export type',
    invalidExportIds: 'Invalid list for export',
    invalidMapLinkMode: 'Invalid map export mode',
    invalidImportRequest: 'Invalid import request',
    notJson: 'The file is corrupted: there is no JSON inside',
    invalidPack: 'The file is not a valid Game Master pack{where}: {reason}',
    unknown: 'unknown error',
    tooLarge: 'The file is too large for a Game Master pack',
    nothingSelected: 'Nothing selected for export',
    singleRealmRequired: 'Select one realm for export',
    realmNotFound: 'Realm not found — it may have been deleted',
    realmNameRequired: 'Enter a name for the new realm',
    targetRealmRequired: 'Select the realm to import the data into',
    selectedNotFound: '{title} not found — the record may have been deleted'
  },
  schema: {
    realmMissing: 'The realm pack contains no realm details',
    realmOnlyInRealmPack: 'Realm details are only allowed in a realm pack',
    emptyKindList: 'The pack contains no records of the selected type',
    duplicatePlaceTypeIds: 'The icons in the pack have duplicate identifiers',
    duplicateMonsterIds: 'The monsters in the pack have duplicate identifiers',
    duplicateUniqueMonsterIds:
      'The unique creatures have duplicate identifiers',
    duplicateMapIds: 'The maps in the pack have duplicate identifiers',
    duplicateGameIds: 'The games in the pack have duplicate identifiers',
    duplicatePlaceIds: 'The map has places with the same identifiers',
    placeMissingIcon: 'A place references an icon that is not in the pack',
    placeMissingMap: 'A place references a map that is not in the pack',
    pathMissingPlace: 'A map path references a place that does not exist',
    gameMissingMap: 'The game references a map that is not in the pack',
    gameMonsterMissingMonster:
      'A game monster references a monster that is not in the pack',
    placementMissingMonster:
      'A placement references a monster that is not in the game',
    duplicatePlacement: 'The monster has several placements in the same game',
    placementMissingMap: 'A placement references an unavailable map',
    placementMissingPlace:
      'A placement references a place that is not on the map',
    defeatedMissingMonster: 'A defeated monster is missing from the game',
    duplicateDefeatedMonster: 'A defeated monster is listed more than once',
    uniqueMonsterMissingMonster:
      'The unique creature references a monster that is not in the pack',
    uniqueMonsterMissingGame:
      'The unique creature references a game that is not in the pack'
  }
}
