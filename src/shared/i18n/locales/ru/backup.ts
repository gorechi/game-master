export const backupMessages = {
  frequencies: {
    off: 'Не делать автоматический бэкап',
    onClose: 'При каждом закрытии приложения',
    daily: 'Один раз в день',
    every2Days: 'Один раз в два дня',
    every3Days: 'Один раз в три дня'
  },
  panel: {
    manualTitle: 'Ручной бэкап',
    manualDescription:
      'Полная копия пользовательских данных: игры, игроки, персонажи, монстры, карты, сеттинги, иконки, тема и язык.',
    create: 'Создать и скачать бэкап',
    creating: 'Создание бэкапа…',
    savedNotice: 'Файл сохранён: {fileName}. В бэкапе: {counts}.',
    restoreTitle: 'Загрузить бэкап',
    restoreDescription: 'Перед заменой текущие данные будут сохранены отдельным файлом.',
    restoredNotice:
      'Данные восстановлены. Резервная копия текущего состояния: {fileName}',
    refreshFailed: 'Данные восстановлены, но не удалось обновить интерфейс: {error}',
    dropTitle: 'Выберите файл .{extension}',
    dropHint: 'или перетащите его сюда',
    backupFrom: 'Бэкап от {date}',
    backupFromWithVersion: 'Бэкап от {date} · версия {version}',
    remove: 'Убрать',
    restoring: 'Восстановление…',
    restore: 'Восстановить бэкап',
    autoTitle: 'Автоматический бэкап',
    autoDescription:
      'Приложение сохраняет копии в выбранную папку и хранит последние {count} автоматических бэкапов.',
    folderLabel: 'Папка для бэкапов',
    chooseFolder: 'Выбрать папку',
    frequencyLabel: 'Когда делать бэкап',
    frequencyAriaLabel: 'Частота автоматического бэкапа',
    webPreviewNote:
      'В веб-предпросмотре автоматический бэкап не записывает файлы на диск.',
    lastBackupLabel: 'Последний автоматический бэкап',
    errorLabel: 'Ошибка',
    confirmTitle: 'Заменить все данные?',
    confirmDescription:
      'Текущие игры, игроков, персонажей, монстров, карты, сеттинги, иконки и тему заменят содержимым бэкапа. Перед заменой приложение сохранит текущее состояние отдельным файлом.',
    confirmCancel: 'Отмена',
    confirmRestore: 'Восстановить',
    neverRun: 'Ещё не выполнялся',
    noUserData: 'Нет пользовательских данных',
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
      characters: {
        one: '{count} персонаж',
        few: '{count} персонажа',
        many: '{count} персонажей',
        other: '{count} персонажей'
      },
      players: {
        one: '{count} игрок',
        few: '{count} игрока',
        many: '{count} игроков',
        other: '{count} игроков'
      },
      realms: {
        one: '{count} сеттинг',
        few: '{count} сеттинга',
        many: '{count} сеттингов',
        other: '{count} сеттингов'
      },
      placeTypes: {
        one: '{count} иконка',
        few: '{count} иконки',
        many: '{count} иконок',
        other: '{count} иконок'
      }
    },
    errors: {
      tooLarge: 'Файл бэкапа слишком большой',
      notJson: 'Файл повреждён: внутри не JSON',
      invalidBackup:
        'Файл не является корректным бэкапом Game Master{where}: {reason}',
      unknown: 'неизвестная ошибка'
    }
  },
  validation: {
    realmRequired: 'В бэкапе должен быть хотя бы один сеттинг',
    duplicateRealmIds: 'В бэкапе повторяются id сеттингов',
    duplicatePlaceTypeIds: 'В бэкапе повторяются id иконок',
    duplicateMonsterIds: 'В бэкапе повторяются id монстров',
    duplicateUniqueMonsterIds: 'В бэкапе повторяются id уникальных существ',
    duplicateMapIds: 'В бэкапе повторяются id карт',
    duplicateGameIds: 'В бэкапе повторяются id игр',
    duplicatePlayerIds: 'В бэкапе повторяются id игроков',
    duplicateCharacterIds: 'В бэкапе повторяются id персонажей',
    missingRealm: 'Запись ссылается на сеттинг, которого нет в бэкапе',
    gameMapMissing: 'Игра ссылается на карту, которой нет в этом сеттинге',
    placementMissingMonster: 'Размещение ссылается на монстра, которого нет в игре',
    duplicatePlacement: 'У монстра несколько размещений в одной игре',
    placementMissingMap: 'Размещение ссылается на недоступную карту',
    placementMissingPlace: 'Размещение ссылается на место, которого нет на карте',
    defeatedMissingMonster: 'Поверженный монстр отсутствует в игре',
    duplicateDefeatedMonster: 'Поверженный монстр указан несколько раз',
    duplicatePlaceIds: 'На карте есть места с одинаковыми id',
    placeMissingIcon: 'Место ссылается на иконку, которой нет в этом сеттинге',
    placeMissingMap: 'Место ссылается на недоступную карту',
    pathMissingPlace: 'Путь карты ссылается на несуществующее место'
  },
  service: {
    dialogs: {
      saveTitle: 'Сохранение бэкапа Game Master',
      openTitle: 'Загрузка бэкапа Game Master',
      folderTitle: 'Папка для автоматических бэкапов',
      filterName: 'Бэкап Game Master'
    },
    errors: {
      tooLarge: 'Файл бэкапа слишком большой',
      notJson: 'Файл повреждён: внутри не JSON',
      invalidBackup:
        'Файл не является корректным бэкапом Game Master{where}: {reason}',
      unknown: 'неизвестная ошибка',
      invalidRestoreRequest: 'Некорректный запрос восстановления',
      pathNotFolder: 'Выбранный путь не является папкой',
      invalidSettings: 'Некорректные настройки бэкапа',
      folderRequired: 'Укажите папку для бэкапов',
      invalidFrequency: 'Некорректная частота автоматического бэкапа'
    }
  }
}
