export const peopleMessages = {
  playersPage: {
    title: 'Игроки',
    description: 'Люди, которые садятся за стол. Их герои — в разделе «Персонажи».',
    create: 'Добавить игрока',
    loading: 'Загружаем базу игроков…',
    empty:
      'Пока ни одного игрока. Добавьте первого — это база людей, которых можно позвать за стол.',
    charactersTitle: 'Персонажи игрока {name}',
    since: 'В базе с {date}',
    edit: 'Редактировать',
    editAria: 'Редактировать игрока {name}',
    delete: 'Удалить',
    deleteAria: 'Удалить игрока {name}',
    deleteTitle: 'Удалить игрока?',
    deleteDescription:
      'Игрок «{name}» будет удалён из базы. Персонажи останутся, но потеряют привязку к игроку.',
    deleteConfirm: 'Удалить'
  },
  playersCount: {
    one: '{count} игрок',
    few: '{count} игрока',
    many: '{count} игроков',
    other: '{count} игроков'
  },
  playerForm: {
    editTitle: 'Редактировать игрока',
    createTitle: 'Новый игрок',
    createDescription: 'Игрок — это человек, который садится за стол.',
    nameRequired: 'Укажите имя игрока',
    cancel: 'Отмена',
    saving: 'Сохраняем…',
    save: 'Сохранить',
    firstNameLabel: 'Имя',
    firstNamePlaceholder: 'Анна',
    lastNameLabel: 'Фамилия',
    lastNamePlaceholder: 'Смирнова'
  },
  playerCharacters: {
    kicker: 'Игрок',
    nameFallback: 'Игрок',
    loadingSummary: 'Загружаем…',
    since: 'в базе с {date}',
    characterCount: {
      one: '{count} персонаж',
      few: '{count} персонажа',
      many: '{count} персонажей',
      other: '{count} персонажей'
    },
    add: 'Добавить персонажа',
    notFound: 'Игрок не найден — возможно, запись удалили.',
    back: 'Вернуться',
    loading: 'Загружаем персонажей…',
    empty: 'У этого игрока пока нет персонажей. Создайте первого героя.',
    noRealm: 'Без сеттинга',
    deleteTitle: 'Удалить персонажа?',
    deleteDescription:
      '«{name}» будет удалён вместе с портретом и статусами. Это действие нельзя отменить.'
  },
  charactersPage: {
    title: 'Персонажи',
    description: 'Герои игроков: у одного человека может быть несколько персонажей.',
    add: 'Добавить персонажа',
    noPlayers: 'Сначала добавьте хотя бы одного игрока — персонаж должен за кем-то числиться.',
    goToPlayers: 'Перейти к игрокам',
    loading: 'Загружаем персонажей…',
    emptyNoPlayers: 'Как только появятся игроки, здесь можно будет создать их героев.',
    empty:
      'Пока ни одного персонажа. Добавьте первого — с портретом, классом и статусами.',
    characterCount: {
      one: '{count} персонаж',
      few: '{count} персонажа',
      many: '{count} персонажей',
      other: '{count} персонажей'
    },
    noRealm: 'Без сеттинга',
    deleteTitle: 'Удалить персонажа?',
    deleteDescription:
      '«{name}» будет удалён вместе с портретом и статусами. Это действие нельзя отменить.'
  },
  characterCard: {
    classMissingTitle: 'Класс не указан',
    noClass: 'Без класса',
    levelAria: 'Уровень {level}',
    level: 'Ур. {level}',
    portraitAlt: 'Портрет: {name}',
    realmLabel: 'Сеттинг',
    raceLabel: 'Раса',
    playerLabel: 'Игрок',
    playerTitle: 'Все персонажи игрока {name}',
    noPlayer: 'Без игрока',
    noStatuses: 'Без статусов',
    edit: 'Редактировать',
    editAria: 'Редактировать персонажа {name}',
    delete: 'Удалить',
    deleteAria: 'Удалить персонажа {name}',
    noPortrait: 'Нет портрета'
  },
  characterForm: {
    editTitle: 'Редактировать персонажа',
    createTitle: 'Новый персонаж',
    createDescription:
      'Портрет, класс, уровень, раса и статусы. Игрок уже должен быть в базе.',
    nameRequired: 'Укажите имя персонажа',
    playerRequired: 'Выберите игрока — персонаж должен за кем-то числиться',
    realmRequired: 'Выберите сеттинг персонажа',
    cancel: 'Отмена',
    saving: 'Сохраняем…',
    save: 'Сохранить',
    uploadPortraitAria: 'Загрузить портрет персонажа',
    portraitAlt: 'Портрет персонажа',
    dropHint: 'Перетащите файл или нажмите',
    processing: 'Обрабатываем…',
    removePhoto: 'Убрать фото',
    nameLabel: 'Имя',
    namePlaceholder: 'Ария Среброкрылая',
    realmLabel: 'Сеттинг *',
    realmAria: 'Сеттинг персонажа',
    realmPlaceholder: 'Выберите сеттинг',
    realmHintEdit: 'Сеттинг задаётся при создании персонажа и не меняется.',
    realmHintCreate:
      'Сеттинг определяет, в каких играх и с какими монстрами может участвовать персонаж.',
    classNameLabel: 'Класс',
    classNamePlaceholder: 'Плут',
    levelLabel: 'Уровень',
    raceLabel: 'Раса',
    racePlaceholder: 'Полуэльф',
    playerLabel: 'Игрок',
    playerPlaceholderEmpty: 'Сначала добавьте игрока',
    playerPlaceholder: 'Выберите игрока',
    orphanPlayer: 'Игрок этого персонажа удалён из базы — выберите нового.'
  },
  statusField: {
    label: 'Статусы',
    removeAria: 'Убрать статус {status}',
    limitReached: 'Достигнут лимит: {count}',
    placeholder: 'Введите статус и нажмите Enter',
    suggestions: {
      wounded: 'Ранен',
      poisoned: 'Отравлен',
      cursed: 'Проклят',
      wanted: 'В розыске',
      hiding: 'Скрывается',
      blessed: 'Благословлён',
      exhausted: 'Истощён',
      dead: 'Мёртв'
    }
  },
  schema: {
    imageFormat: 'Ожидается изображение в формате data URL (png, jpeg или webp)'
  }
}
