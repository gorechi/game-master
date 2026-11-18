export const mapsMessages = {
  page: {
    title: 'Карты',
    description: 'Пространства, в которых проходят игры: места и пути между ними.',
    create: 'Создать карту',
    filterLabel: 'Сеттинг',
    filterAriaLabel: 'Фильтр карт по сеттингу',
    allRealms: 'Все сеттинги',
    loading: 'Загружаем карты…',
    empty: 'Пока ни одной карты. Создайте первую — добавьте места и соедините их путями.',
    emptyFiltered: 'В выбранном сеттинге пока нет карт.',
    showAll: 'Показать все карты',
    cardCount: {
      one: 'карта',
      few: 'карты',
      many: 'карт',
      other: 'карты'
    },
    total: 'всего {count}',
    noRealm: 'Без сеттинга',
    placeCount: {
      one: 'место',
      few: 'места',
      many: 'мест',
      other: 'места'
    },
    pathCount: {
      one: 'путь',
      few: 'пути',
      many: 'путей',
      other: 'пути'
    },
    view: 'Просмотр',
    edit: 'Редактировать',
    editAriaLabel: 'Редактировать карту {name}',
    delete: 'Удалить',
    deleteAriaLabel: 'Удалить карту {name}',
    deleteTitle: 'Удалить карту?',
    deleteDescription:
      '«{name}» и все её места и пути будут удалены. Ссылки выходов на эту карту в других картах будут очищены. Это действие нельзя отменить.'
  },
  graphPage: {
    back: '← Карты',
    kicker: 'Карта',
    titleFallback: 'Карта',
    loading: 'Загружаем карту…',
    placeCount: {
      one: 'место',
      few: 'места',
      many: 'мест',
      other: 'места'
    },
    pathCount: {
      one: 'путь',
      few: 'пути',
      many: 'путей',
      other: 'пути'
    },
    edit: 'Редактировать',
    notFound: 'Карта не найдена — возможно, запись уже удалена.',
    backToMaps: 'Вернуться к картам',
    pathTooltip: 'Двойной клик по пути удаляет его',
    pathLegend: 'Путь между местами',
    exitLegend: 'Выход на другую карту',
    zoomHint: 'Колесо — масштаб',
    resetZoom: 'Сбросить масштаб',
    resetZoomLabel: 'Сбросить масштаб карты',
    saveChanges: 'Сохранить изменения',
    saveChangesLabel: 'Сохранить изменения карты',
    resetChanges: 'Сбросить изменения',
    resetChangesLabel: 'Вернуть сохранённое состояние карты'
  },
  graph: {
    emptyTitle: 'На карте пока нет мест.',
    emptyHint: 'Добавьте их в редакторе — и на карте появятся первые точки.',
    ariaLabel: 'Карта «{name}»',
    removePathHint: 'Двойной клик — удалить путь',
    moveHint: 'Перетащите, чтобы сдвинуть',
    moveAndOpenHint: 'Перетащите, чтобы сдвинуть. Нажмите, чтобы перейти на «{name}»',
    openMapHint: 'Открыть карту «{name}»',
    linkedNodeLabel: '{name}: перейти на карту «{linked}»',
    descriptionTooltip: 'Описание места',
    descriptionAddTooltip: 'Добавить описание',
    descriptionLabel: 'Описание локации «{name}»',
    descriptionAddLabel: 'Добавить описание локации «{name}»',
    monstersTooltip: 'Монстры здесь: {names}',
    monstersLabel: 'Монстры в локации «{name}»',
    connectHint: 'Потяните, чтобы провести путь'
  },
  mapForm: {
    nameRequired: 'Укажите название карты',
    realmRequired: 'Выберите сеттинг карты',
    editTitle: 'Редактировать карту',
    createTitle: 'Новая карта',
    description:
      'Пространство, в котором проходит игра. Добавьте места и соедините их путями.',
    cancel: 'Отмена',
    saving: 'Сохраняем…',
    save: 'Сохранить карту',
    nameLabel: 'Название карты',
    namePlaceholder: 'Королевство пепельных дорог',
    realmLabel: 'Сеттинг *',
    realmAriaLabel: 'Сеттинг карты',
    realmPlaceholder: 'Выберите сеттинг',
    realmHint:
      'Карта принадлежит выбранному сеттингу. При смене сеттинга иконки всех мест сбрасываются.',
    noRealms: 'Нет доступных сеттингов. Создайте сеттинг, чтобы добавлять карты.',
    realmChangeWarning:
      'При сохранении карты в другом сеттинге иконки всех мест будут сброшены.',
    placesTitle: 'Места',
    placeCount: {
      one: 'место',
      few: 'места',
      many: 'мест',
      other: 'места'
    },
    pathCount: {
      one: 'путь',
      few: 'пути',
      many: 'путей',
      other: 'пути'
    },
    placePlaceholder: 'Название нового места',
    placePlaceholderNoRealm: 'Сначала выберите сеттинг',
    addPlace: 'Добавить место',
    iconHint: 'Иконка выбирается в карточке места — нажмите на карандаш рядом с названием.',
    emptyPlaces: 'Пока ни одного места. Добавьте первое — с него начнётся карта.',
    placeIconTooltip: 'Иконка места',
    exitBadge: 'Выход',
    editPlace: 'Редактировать место и пути',
    editPlaceLabel: 'Редактировать место {name}',
    deletePlace: 'Удалить место',
    deletePlaceLabel: 'Удалить место {name}',
    connectionsHint:
      'Откройте место, чтобы отметить, с какими местами оно связано. Пути двусторонние: связь сразу появится у второго места. У выхода можно выбрать карту, на которую он ведёт.'
  },
  placeForm: {
    nameRequired: 'Укажите название места',
    emptyDescription: 'Добавьте описание, заметки и важные детали этого места.',
    title: 'Место',
    createTitle: 'Новое место',
    description:
      'Название, иконка, выход на другую карту и пути к другим местам. Путь всегда двусторонний.',
    cancel: 'Отмена',
    save: 'Сохранить место',
    descriptionLabel: 'Описание места',
    editDescription: 'Редактировать описание',
    editDescriptionLabel: 'Редактировать описание места',
    nameLabel: 'Название места',
    namePlaceholder: 'Таверна «Пьяный гоблин»',
    iconLabel: 'Иконка',
    changeIcon: 'Изменить иконку',
    chooseIcon: 'Выбрать иконку',
    noIcons: 'В сеттинге пока нет иконок. Добавьте их на экране сеттинга.',
    exitTitle: 'Выход из карты',
    exitHint: 'Место, через которое можно перейти на другую карту.',
    exitTargetLabel: 'Выход ведёт на карту',
    noOtherMaps: 'Других карт пока нет. Создайте их в разделе «Карты», чтобы связать выход.',
    exitTargetAriaLabel: 'Карта, на которую ведёт выход',
    notChosen: 'Не выбрано',
    pathsTitle: 'Пути',
    chosenCount: 'выбрано {count}',
    noOtherPlaces: 'На карте пока нет других мест. Добавьте их, чтобы проложить пути.',
    exitBadge: 'Выход',
    placeFallback: 'Место'
  },
  iconPicker: {
    title: 'Иконка места',
    cancel: 'Отмена',
    confirm: 'Выбрать иконку',
    clear: 'Оставить без иконки',
    groupLabel: 'Иконка места',
    none: 'Без иконки',
    iconLabel: 'Иконка {index}'
  },
  description: {
    title: 'Описание места',
    cancel: 'Отмена',
    saving: 'Сохраняем…',
    save: 'Сохранить описание',
    notesLabel: 'Заметки мастера',
    notesPlaceholder:
      'Что важно помнить об этом месте? Кто здесь живёт, что случилось, какие тайны и подсказки нужно не забыть…'
  },
  monsters: {
    title: 'Монстры в локации',
    close: 'Закрыть',
    empty: 'В этой локации нет живых монстров.',
    stats: 'ХП {hp} · КО {cr}'
  }
}
