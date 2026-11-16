export const enMapsMessages = {
  page: {
    title: 'Maps',
    description: 'The spaces where games take place: places and the paths between them.',
    create: 'Create map',
    filterLabel: 'Realm',
    filterAriaLabel: 'Filter maps by realm',
    allRealms: 'All realms',
    loading: 'Loading maps…',
    empty: 'No maps yet. Create the first one — add places and connect them with paths.',
    emptyFiltered: 'The selected realm has no maps yet.',
    showAll: 'Show all maps',
    cardCount: {
      one: 'map',
      other: 'maps'
    },
    total: '{count} total',
    noRealm: 'No realm',
    placeCount: {
      one: 'place',
      other: 'places'
    },
    pathCount: {
      one: 'path',
      other: 'paths'
    },
    view: 'View',
    edit: 'Edit',
    editAriaLabel: 'Edit map {name}',
    delete: 'Delete',
    deleteAriaLabel: 'Delete map {name}',
    deleteTitle: 'Delete map?',
    deleteDescription:
      '“{name}” and all its places and paths will be deleted. Exit links to this map in other maps will be cleared. This action cannot be undone.'
  },
  graphPage: {
    back: '← Maps',
    kicker: 'Map',
    titleFallback: 'Map',
    loading: 'Loading map…',
    placeCount: {
      one: 'place',
      other: 'places'
    },
    pathCount: {
      one: 'path',
      other: 'paths'
    },
    edit: 'Edit',
    notFound: 'Map not found — the record may have been deleted already.',
    backToMaps: 'Back to maps',
    pathTooltip: 'Double-click a path to delete it',
    pathLegend: 'Path between places',
    exitLegend: 'Exit to another map',
    zoomHint: 'Scroll to zoom',
    resetZoom: 'Reset zoom',
    resetZoomLabel: 'Reset map zoom',
    saveChanges: 'Save changes',
    saveChangesLabel: 'Save map changes',
    resetChanges: 'Reset changes',
    resetChangesLabel: 'Restore the saved state of the map'
  },
  graph: {
    emptyTitle: 'This map has no places yet.',
    emptyHint: 'Add them in the editor — the first dots will appear on the map.',
    ariaLabel: 'Map "{name}"',
    removePathHint: 'Double-click to delete the path',
    moveHint: 'Drag to move',
    moveAndOpenHint: 'Drag to move. Click to go to "{name}"',
    openMapHint: 'Open map "{name}"',
    linkedNodeLabel: '{name}: go to map "{linked}"',
    descriptionTooltip: 'Place description',
    descriptionLabel: 'Description of place "{name}"',
    monstersTooltip: 'Monsters here: {names}',
    monstersLabel: 'Monsters in place "{name}"',
    connectHint: 'Drag to draw a path'
  },
  mapForm: {
    nameRequired: 'Enter a map name',
    realmRequired: 'Choose a realm for the map',
    editTitle: 'Edit map',
    createTitle: 'New map',
    description:
      'The space where the game takes place. Add places and connect them with paths.',
    cancel: 'Cancel',
    saving: 'Saving…',
    save: 'Save map',
    nameLabel: 'Map name',
    namePlaceholder: 'Kingdom of Ashen Roads',
    realmLabel: 'Realm *',
    realmAriaLabel: 'Map realm',
    realmPlaceholder: 'Choose a realm',
    realmHint:
      'The map belongs to the selected realm. Changing the realm resets the icons of all places.',
    noRealms: 'No realms available. Create a realm to add maps.',
    realmChangeWarning:
      'Saving the map in another realm will reset the icons of all places.',
    placesTitle: 'Places',
    placeCount: {
      one: 'place',
      other: 'places'
    },
    pathCount: {
      one: 'path',
      other: 'paths'
    },
    placePlaceholder: 'New place name',
    placePlaceholderNoRealm: 'Choose a realm first',
    addPlace: 'Add place',
    iconHint: 'The icon is chosen in the place card — click the pencil next to the name.',
    emptyPlaces: 'No places yet. Add the first one — the map starts with it.',
    placeIconTooltip: 'Place icon',
    exitBadge: 'Exit',
    editPlace: 'Edit place and paths',
    editPlaceLabel: 'Edit place {name}',
    deletePlace: 'Delete place',
    deletePlaceLabel: 'Delete place {name}',
    connectionsHint:
      'Open a place to mark which places it connects to. Paths are two-way: the connection appears on the second place right away. For an exit, you can choose the map it leads to.'
  },
  placeForm: {
    nameRequired: 'Enter a place name',
    emptyDescription: 'Add a description, notes, and important details about this place.',
    title: 'Place',
    createTitle: 'New place',
    description:
      'Name, icon, an exit to another map, and paths to other places. A path is always two-way.',
    cancel: 'Cancel',
    save: 'Save place',
    descriptionLabel: 'Place description',
    editDescription: 'Edit description',
    editDescriptionLabel: 'Edit place description',
    nameLabel: 'Place name',
    namePlaceholder: 'The Drunken Goblin Tavern',
    iconLabel: 'Icon',
    changeIcon: 'Change icon',
    chooseIcon: 'Choose icon',
    noIcons: 'The realm has no icons yet. Add them on the realm screen.',
    exitTitle: 'Exit from map',
    exitHint: 'A place through which you can move to another map.',
    exitTargetLabel: 'Exit leads to map',
    noOtherMaps: 'No other maps yet. Create them in the "Maps" section to link the exit.',
    exitTargetAriaLabel: 'Map the exit leads to',
    notChosen: 'Not selected',
    pathsTitle: 'Paths',
    chosenCount: '{count} selected',
    noOtherPlaces: 'This map has no other places yet. Add them to lay paths.',
    exitBadge: 'Exit',
    placeFallback: 'Place'
  },
  iconPicker: {
    title: 'Place icon',
    cancel: 'Cancel',
    confirm: 'Choose icon',
    clear: 'Leave without an icon',
    groupLabel: 'Place icon',
    none: 'No icon',
    iconLabel: 'Icon {index}'
  },
  description: {
    title: 'Place description',
    cancel: 'Cancel',
    saving: 'Saving…',
    save: 'Save description',
    notesLabel: 'Game master notes',
    notesPlaceholder:
      'What is important to remember about this place? Who lives here, what happened, what secrets and clues should not be forgotten…'
  },
  monsters: {
    title: 'Monsters in place',
    close: 'Close',
    empty: 'There are no living monsters in this place.',
    stats: 'HP {hp} · CR {cr}'
  }
}
