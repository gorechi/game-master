export const dataMessages = {
  title: 'Данные',
  description:
    'Перенос игр, карт, монстров, уникальных существ и сеттингов между установками. Игроки и персонажи не экспортируются.',
  tabs: {
    label: 'Разделы данных',
    games: 'Игры',
    maps: 'Карты',
    monsters: 'Монстры',
    uniqueMonsters: 'Уникальные существа',
    realms: 'Сеттинги',
    backup: 'Бэкап'
  },
  tabDescriptions: {
    games:
      'Выберите игры. В пакет войдут их карты, связанные карты, иконки и монстры внутри игр.',
    maps: 'Выберите карты. При экспорте можно добавить связанные карты или оставить только выбранные.',
    monsters: 'Выберите монстров из бестиария. Игроки и персонажи в пакет не попадают.',
    uniqueMonsters: 'Выберите уникальных существ. Их можно перенести отдельно от игр.',
    realms:
      'Выберите один сеттинг. В пакет войдут только его игры, карты, монстры, существа и иконки.'
  },
  exportHints: {
    games: 'Пакет игр',
    maps: 'Пакет карт',
    monsters: 'Пакет бестиария',
    uniqueMonsters: 'Пакет уникальных существ',
    realms: 'Пакет сеттинга'
  },
  plural: {
    games: {
      one: '{count} игра',
      few: '{count} игры',
      many: '{count} игр',
      other: '{count} игр'
    },
    maps: {
      one: '{count} карта',
      few: '{count} карты',
      many: '{count} карт',
      other: '{count} карт'
    },
    monsters: {
      one: '{count} монстр',
      few: '{count} монстра',
      many: '{count} монстров',
      other: '{count} монстров'
    },
    uniqueMonsters: {
      one: '{count} существо',
      few: '{count} существа',
      many: '{count} существ',
      other: '{count} существ'
    },
    placeTypes: {
      one: '{count} иконка',
      few: '{count} иконки',
      many: '{count} иконок',
      other: '{count} иконок'
    },
    places: {
      one: '{count} место',
      few: '{count} места',
      many: '{count} мест',
      other: '{count} мест'
    },
    paths: {
      one: '{count} связь',
      few: '{count} связи',
      many: '{count} связей',
      other: '{count} связей'
    },
    monstersInGame: {
      one: '{count} монстр в игре',
      few: '{count} монстра в игре',
      many: '{count} монстров в игре',
      other: '{count} монстров в игре'
    }
  },
  emptyPack: 'пустой пакет',
  items: {
    withoutRealm: 'Без сеттинга',
    withoutDescription: 'Без описания',
    monsterStats: 'КО {cr} · КЗ {ac} · {hp} ХП'
  },
  export: {
    title: 'Экспорт',
    filterLabel: 'Фильтр по сеттингу',
    filterAriaLabel: 'Фильтр по сеттингу',
    filterPlaceholder: 'Все сеттинги',
    allRealms: 'Все сеттинги',
    selectAll: 'Выбрать все',
    selectOneRealm: 'Выберите один сеттинг',
    clearSelection: 'Снять выбор',
    counter: '{selected} из {total}',
    loading: 'Загрузка данных…',
    noRealms: 'Сеттингов пока нет.',
    nothingInRealm: 'В выбранном сеттинге пока нечего экспортировать.',
    nothing: 'Здесь пока нечего экспортировать.',
    withLinkedMaps: 'Со связанными картами',
    selectedMapsOnly: 'Только выбранные карты',
    packWillInclude: 'В пакет войдёт',
    exporting: 'Экспорт…',
    submit: 'Экспортировать',
    saved: 'Файл сохранён: {fileName}. В пакете: {counts}.',
    savedWithRemovedLinks:
      'Файл сохранён: {fileName}. В пакете: {counts}. Связи с другими картами в файле удалены.',
    modalTitle: 'Экспорт карт со связями',
    modalDescription:
      'У выбранных карт есть выходы на другие карты. Что включить в файл экспорта?',
    modalSelectedOnly: 'Только выбранные карты',
    modalIncludeLinked: 'Включить связанные карты',
    modalBody:
      'При экспорте только выбранных карт ссылки на другие карты будут удалены из файла. В самих картах ничего не изменится.'
  },
  import: {
    title: 'Импорт',
    description:
      'Пакет проверяется до записи. Все идентификаторы создаются заново, связи внутри пакета сохраняются.',
    success: 'Импортировано в «{realm}»: {counts}.',
    emptyRealmCreated: 'Сеттинг «{realm}» создан без сущностей.',
    dropTitle: 'Выберите файл .{extension}',
    dropHint: 'или перетащите его сюда',
    packSummary: 'Пакет «{kind}» · {counts}',
    remove: 'Убрать',
    newRealmHint: 'Будет создан новый сеттинг. Его название можно изменить.',
    realmNameLabel: 'Название сеттинга',
    descriptionLabel: 'Описание',
    targetRealmLabel: 'Сеттинг для импорта',
    targetRealmAriaLabel: 'Сеттинг для импорта',
    targetRealmPlaceholder: 'Выберите сеттинг',
    targetRealmHint:
      'Импортированные записи будут привязаны только к выбранному сеттингу.',
    selectedRealm: 'выбранный сеттинг',
    submitting: 'Импорт…',
    submit: 'Импортировать'
  },
  errors: {
    notJson: 'Файл повреждён: внутри не JSON',
    invalidPack: 'Файл не является корректным пакетом Game Master{where}: {reason}',
    unknown: 'неизвестная ошибка',
    tooLarge: 'Файл слишком большой для пакета Game Master',
    realmNameRequired: 'Укажите название нового сеттинга',
    targetRealmRequired: 'Выберите сеттинг, в который нужно импортировать данные',
    wrongTab: 'Это пакет «{kind}». Откройте вкладку «{tab}».'
  }
}
