// Тексты импорта и экспорта пакетов.
export const dataPackMessages = {
  kindLabels: {
    games: 'Игры',
    maps: 'Карты',
    monsters: 'Монстры',
    uniqueMonsters: 'Уникальные существа',
    realm: 'Сеттинг'
  },
  entityTitles: {
    game: 'Игра',
    map: 'Карта',
    monster: 'Монстр',
    uniqueMonster: 'Уникальное существо'
  },
  dialogs: {
    exportTitle: 'Экспорт данных Game Master',
    importTitle: 'Импорт данных Game Master',
    filterName: 'Пакет Game Master'
  },
  errors: {
    invalidExportRequest: 'Некорректный запрос экспорта',
    unknownExportKind: 'Неизвестный тип экспорта',
    invalidExportIds: 'Некорректный список для экспорта',
    invalidMapLinkMode: 'Некорректный режим экспорта карт',
    invalidImportRequest: 'Некорректный запрос импорта',
    notJson: 'Файл повреждён: внутри не JSON',
    invalidPack: 'Файл не является корректным пакетом Game Master{where}: {reason}',
    unknown: 'неизвестная ошибка',
    tooLarge: 'Файл слишком большой для пакета Game Master',
    nothingSelected: 'Ничего не выбрано для экспорта',
    singleRealmRequired: 'Для экспорта выберите один сеттинг',
    realmNotFound: 'Сеттинг не найден — возможно, он был удалён',
    realmNameRequired: 'Укажите название нового сеттинга',
    targetRealmRequired: 'Выберите сеттинг, в который нужно импортировать данные',
    selectedNotFound: '{title} не найден — возможно, запись уже удалена'
  },
  schema: {
    realmMissing: 'В пакете сеттинга нет сведений о сеттинге',
    realmOnlyInRealmPack: 'Сведения о сеттинге допустимы только в пакете сеттинга',
    emptyKindList: 'В пакете нет ни одной записи выбранного типа',
    duplicatePlaceTypeIds: 'Иконки в пакете имеют повторяющиеся идентификаторы',
    duplicateMonsterIds: 'Монстры в пакете имеют повторяющиеся идентификаторы',
    duplicateUniqueMonsterIds: 'Уникальные существа имеют повторяющиеся идентификаторы',
    duplicateMapIds: 'Карты в пакете имеют повторяющиеся идентификаторы',
    duplicateGameIds: 'Игры в пакете имеют повторяющиеся идентификаторы',
    duplicatePlaceIds: 'На карте есть места с одинаковыми идентификаторами',
    placeMissingIcon: 'Место ссылается на иконку, которой нет в пакете',
    placeMissingMap: 'Место ссылается на карту, которой нет в пакете',
    pathMissingPlace: 'Путь карты ссылается на несуществующее место',
    gameMissingMap: 'Игра ссылается на карту, которой нет в пакете',
    gameMonsterMissingMonster:
      'Игровой монстр ссылается на монстра, которого нет в пакете',
    placementMissingMonster: 'Размещение ссылается на монстра, которого нет в игре',
    duplicatePlacement: 'У монстра несколько размещений в одной игре',
    placementMissingMap: 'Размещение ссылается на недоступную карту',
    placementMissingPlace: 'Размещение ссылается на место, которого нет на карте',
    defeatedMissingMonster: 'Поверженный монстр отсутствует в игре',
    duplicateDefeatedMonster: 'Поверженный монстр указан несколько раз',
    uniqueMonsterMissingMonster:
      'Уникальное существо ссылается на монстра, которого нет в пакете',
    uniqueMonsterMissingGame:
      'Уникальное существо ссылается на игру, которой нет в пакете'
  }
}
