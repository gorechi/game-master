// English messages for the data section.
export const enDataMessages = {
  title: 'Data',
  description:
    'Move games, maps, monsters, unique creatures and realms between installations. Players and characters are not exported.',
  tabs: {
    label: 'Data sections',
    games: 'Games',
    maps: 'Maps',
    monsters: 'Monsters',
    uniqueMonsters: 'Unique creatures',
    realms: 'Realms',
    backup: 'Backup'
  },
  tabDescriptions: {
    games:
      'Select games. The pack will include their maps, linked maps, icons and monsters inside the games.',
    maps: 'Select maps. When exporting, you can add linked maps or keep only the selected ones.',
    monsters: 'Select monsters from the bestiary. Players and characters are not included in the pack.',
    uniqueMonsters: 'Select unique creatures. They can be moved separately from games.',
    realms:
      'Select one realm. The pack will include only its games, maps, monsters, creatures and icons.'
  },
  exportHints: {
    games: 'Games pack',
    maps: 'Maps pack',
    monsters: 'Bestiary pack',
    uniqueMonsters: 'Unique creatures pack',
    realms: 'Realm pack'
  },
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
    placeTypes: {
      one: '{count} icon',
      other: '{count} icons'
    },
    places: {
      one: '{count} place',
      other: '{count} places'
    },
    paths: {
      one: '{count} map link',
      other: '{count} map links'
    },
    monstersInGame: {
      one: '{count} monster in the game',
      other: '{count} monsters in the game'
    }
  },
  emptyPack: 'Empty pack',
  items: {
    withoutRealm: 'No realm',
    withoutDescription: 'No description',
    monsterStats: 'CR {cr} · AC {ac} · HP {hp}'
  },
  export: {
    title: 'Export',
    filterLabel: 'Filter by realm',
    filterAriaLabel: 'Filter by realm',
    filterPlaceholder: 'All realms',
    allRealms: 'All realms',
    selectAll: 'Select all',
    selectOneRealm: 'Select one realm',
    clearSelection: 'Clear selection',
    counter: '{selected} of {total}',
    loading: 'Loading data…',
    noRealms: 'No realms yet.',
    nothingInRealm: 'There is nothing to export in the selected realm yet.',
    nothing: 'There is nothing to export here yet.',
    withLinkedMaps: 'With linked maps',
    selectedMapsOnly: 'Selected maps only',
    packWillInclude: 'The pack will include',
    exporting: 'Exporting…',
    submit: 'Export',
    saved: 'File saved: {fileName}. In the pack: {counts}.',
    savedWithRemovedLinks:
      'File saved: {fileName}. In the pack: {counts}. Links to other maps were removed from the file.',
    modalTitle: 'Export maps with links',
    modalDescription:
      'The selected maps have exits to other maps. What should be included in the export file?',
    modalSelectedOnly: 'Selected maps only',
    modalIncludeLinked: 'Include linked maps',
    modalBody:
      'When exporting only the selected maps, links to other maps will be removed from the file. Nothing will change in the maps themselves.'
  },
  import: {
    title: 'Import',
    description:
      'The pack is validated before writing. All identifiers are created anew, and links inside the pack are preserved.',
    success: 'Imported into “{realm}”: {counts}.',
    emptyRealmCreated: 'Realm “{realm}” was created with no entities.',
    dropTitle: 'Select a .{extension} file',
    dropHint: 'or drag it here',
    packSummary: '“{kind}” pack · {counts}',
    remove: 'Remove',
    newRealmHint: 'A new realm will be created. You can change its name.',
    realmNameLabel: 'Realm name',
    descriptionLabel: 'Description',
    targetRealmLabel: 'Realm for import',
    targetRealmAriaLabel: 'Realm for import',
    targetRealmPlaceholder: 'Select a realm',
    targetRealmHint:
      'Imported records will be linked only to the selected realm.',
    selectedRealm: 'selected realm',
    submitting: 'Importing…',
    submit: 'Import'
  },
  errors: {
    notJson: 'The file is corrupted: it does not contain JSON',
    invalidPack: 'The file is not a valid Game Master pack{where}: {reason}',
    unknown: 'unknown error',
    tooLarge: 'The file is too large for a Game Master pack',
    realmNameRequired: 'Enter a name for the new realm',
    targetRealmRequired: 'Select the realm to import the data into',
    wrongTab: 'This is a “{kind}” pack. Open the “{tab}” tab.'
  }
}
