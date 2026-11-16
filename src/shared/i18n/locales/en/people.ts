export const enPeopleMessages = {
  playersPage: {
    title: 'Players',
    description: 'The people who sit at the table. Their heroes live under Characters.',
    create: 'Add player',
    loading: 'Loading players…',
    empty:
      'No players yet. Add the first one — these are the people you can invite to the table.',
    charactersTitle: 'Characters of player {name}',
    since: 'In the roster since {date}',
    edit: 'Edit',
    editAria: 'Edit player {name}',
    delete: 'Delete',
    deleteAria: 'Delete player {name}',
    deleteTitle: 'Delete player?',
    deleteDescription:
      'Player “{name}” will be removed. Characters will remain but lose their link to the player.',
    deleteConfirm: 'Delete'
  },
  playersCount: {
    one: '{count} player',
    other: '{count} players'
  },
  playerForm: {
    editTitle: 'Edit player',
    createTitle: 'New player',
    createDescription: 'A player is a person who sits at the table.',
    nameRequired: 'Enter a player name',
    cancel: 'Cancel',
    saving: 'Saving…',
    save: 'Save',
    firstNameLabel: 'First name',
    firstNamePlaceholder: 'Anna',
    lastNameLabel: 'Last name',
    lastNamePlaceholder: 'Smirnova'
  },
  playerCharacters: {
    kicker: 'Player',
    nameFallback: 'Player',
    loadingSummary: 'Loading…',
    since: 'in the roster since {date}',
    characterCount: {
      one: '{count} character',
      other: '{count} characters'
    },
    add: 'Add character',
    notFound: 'Player not found — the record may have been deleted.',
    back: 'Go back',
    loading: 'Loading characters…',
    empty: 'This player has no characters yet. Create the first hero.',
    noRealm: 'No realm',
    deleteTitle: 'Delete character?',
    deleteDescription:
      '“{name}” will be deleted along with the portrait and statuses. This action cannot be undone.'
  },
  charactersPage: {
    title: 'Characters',
    description: 'Player heroes: one person can have several characters.',
    add: 'Add character',
    noPlayers: 'Add at least one player first — a character must belong to someone.',
    goToPlayers: 'Go to players',
    loading: 'Loading characters…',
    emptyNoPlayers: 'Once players appear, you will be able to create their heroes here.',
    empty:
      'No characters yet. Add the first one — with a portrait, class, and statuses.',
    characterCount: {
      one: '{count} character',
      other: '{count} characters'
    },
    noRealm: 'No realm',
    deleteTitle: 'Delete character?',
    deleteDescription:
      '“{name}” will be deleted along with the portrait and statuses. This action cannot be undone.'
  },
  characterCard: {
    classMissingTitle: 'Class not specified',
    noClass: 'No class',
    levelAria: 'Level {level}',
    level: 'Lvl. {level}',
    portraitAlt: 'Portrait: {name}',
    realmLabel: 'Realm',
    raceLabel: 'Race',
    playerLabel: 'Player',
    playerTitle: 'All characters of player {name}',
    noPlayer: 'No player',
    noStatuses: 'No statuses',
    edit: 'Edit',
    editAria: 'Edit character {name}',
    delete: 'Delete',
    deleteAria: 'Delete character {name}',
    noPortrait: 'No portrait'
  },
  characterForm: {
    editTitle: 'Edit character',
    createTitle: 'New character',
    createDescription:
      'Portrait, class, level, race, and statuses. The player must already be in the base.',
    nameRequired: 'Enter a character name',
    playerRequired: 'Select a player — a character must belong to someone',
    realmRequired: 'Select the character realm',
    cancel: 'Cancel',
    saving: 'Saving…',
    save: 'Save',
    uploadPortraitAria: 'Upload character portrait',
    portraitAlt: 'Character portrait',
    dropHint: 'Drag a file here or click',
    processing: 'Processing…',
    removePhoto: 'Remove photo',
    nameLabel: 'Name',
    namePlaceholder: 'Aria Silverwing',
    realmLabel: 'Realm *',
    realmAria: 'Character realm',
    realmPlaceholder: 'Select a realm',
    realmHintEdit: 'The realm is set when the character is created and does not change.',
    realmHintCreate:
      'The realm determines which games the character can take part in and which monsters it can face.',
    classNameLabel: 'Class',
    classNamePlaceholder: 'Rogue',
    levelLabel: 'Level',
    raceLabel: 'Race',
    racePlaceholder: 'Half-elf',
    playerLabel: 'Player',
    playerPlaceholderEmpty: 'Add a player first',
    playerPlaceholder: 'Select a player',
    orphanPlayer: 'The player of this character has been removed from the base — select a new one.'
  },
  statusField: {
    label: 'Statuses',
    removeAria: 'Remove status {status}',
    limitReached: 'Limit reached: {count}',
    placeholder: 'Enter a status and press Enter',
    suggestions: {
      wounded: 'Wounded',
      poisoned: 'Poisoned',
      cursed: 'Cursed',
      wanted: 'Wanted',
      hiding: 'In hiding',
      blessed: 'Blessed',
      exhausted: 'Exhausted',
      dead: 'Dead'
    }
  },
  schema: {
    imageFormat: 'Expected an image in data URL format (png, jpeg, or webp)'
  }
}
