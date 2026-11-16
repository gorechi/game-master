// Bestiary and unique creature texts.
export const enBestiaryMessages = {
  page: {
    title: 'Bestiary',
    description:
      'Bestiary: ability scores, ratings, and abilities. Every entry can be used in games.',
    add: 'Add monster',
    loading: 'Loading the bestiary…',
    empty:
      'No monsters yet. Add the first one — with ability scores and abilities.',
    noRealm: 'No realm',
    monstersCount: {
      one: '{count} monster',
      other: '{count} monsters'
    },
    realmRequired: 'Select the monster realm',
    deleteTitle: 'Delete monster?',
    deleteDescription:
      '“{name}” will be deleted from the bestiary along with its abilities. This action cannot be undone.'
  },
  form: {
    cancel: 'Cancel',
    createTitle: 'New monster',
    editTitle: 'Edit monster',
    description:
      'Ability scores, ratings, and abilities. Abilities can be added and removed.',
    nameRequired: 'Enter a monster name',
    abilityNameRequired: 'Enter a name for each ability',
    realmRequired: 'Select the monster realm',
    saving: 'Saving…',
    save: 'Save',
    realmLabel: 'Realm *',
    realmAria: 'Monster realm',
    realmPlaceholder: 'Select a realm',
    realmHintLocked: 'The realm is set when the monster is created and does not change.',
    realmHint: 'The monster will be available in games and in the bestiary of this realm.',
    nameLabel: 'Name',
    namePlaceholder: 'Skeleton Guard',
    scoresHint:
      'An ability score ranges from 1 to 30. The modifier is calculated automatically.',
    challengeRatingLabel: 'Challenge rating',
    armorClassLabel: 'Armor class',
    hitPointsLabel: 'Health',
    abilitiesLabel: 'Abilities',
    abilitiesEmpty:
      'No abilities yet. Add the first one — each ability is a separate field.',
    abilityNamePlaceholder: 'Ability name',
    removeAbility: 'Remove ability',
    abilityDescriptionPlaceholder: 'What the ability does',
    addAbility: 'Add ability'
  },
  stats: {
    strength: { short: 'STR', label: 'Strength' },
    dexterity: { short: 'DEX', label: 'Dexterity' },
    constitution: { short: 'CON', label: 'Constitution' },
    intelligence: { short: 'INT', label: 'Intelligence' },
    wisdom: { short: 'WIS', label: 'Wisdom' },
    charisma: { short: 'CHA', label: 'Charisma' }
  },
  statField: {
    ariaLabel: '{label}: value from 1 to 30'
  },
  card: {
    challengeRating: 'CR {cr}',
    armorClass: 'AC {ac}',
    hitPoints: 'HP {hp}',
    edit: 'Edit',
    editAria: 'Edit monster {name}',
    delete: 'Delete',
    deleteAria: 'Delete monster {name}'
  },
  saved: {
    title: 'Unique creatures',
    description:
      'Unique instances for future games. This is a separate library — it does not change the bestiary.',
    create: 'Create monster',
    loading: 'Loading saved monsters…',
    empty:
      'No saved monsters yet. Create a unique one or save monsters when you finish a game.',
    noRealm: 'No realm',
    libraryCount: {
      one: '{count} monster in the library',
      other: '{count} monsters in the library'
    },
    editTitle: 'Edit unique monster',
    createTitle: 'Set up unique monster',
    editDescription: 'Only this instance changes. The bestiary stays untouched.',
    createDescription:
      'An instance based on “{name}”. Changes do not affect the bestiary.',
    uniqueBadge: 'Unique',
    deleteTitle: 'Delete saved monster?',
    deleteDescription:
      '“{name}” will be deleted from the unique monster library. This action cannot be undone.'
  },
  base: {
    cancel: 'Cancel',
    title: 'New unique monster',
    description:
      'Select a base monster from the bestiary, then configure the instance.',
    next: 'Next',
    emptyBestiary:
      'The bestiary has no monsters yet. Add at least one in the “Monsters” section first.',
    monsterLabel: 'Base monster',
    monsterAria: 'Base monster from the bestiary',
    searchPlaceholder: 'Search for a monster…',
    option: '{name} · CR {cr} · {realm}',
    hint: 'A separate instance based on “{name}” will be created. Changes will not affect the bestiary.'
  }
}
