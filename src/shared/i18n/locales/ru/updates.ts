export const updatesMessages = {
  notice: {
    available: 'Доступна новая версия {version}',
    hint: 'У вас {current}. Установщик можно скачать на странице релизов.',
    releases: 'Страница релизов',
    dismiss: 'Скрыть уведомление',
    dismissLabel: 'Скрыть уведомление о новой версии'
  },
  section: {
    title: 'Обновления',
    description:
      'Приложение проверяет последний релиз на GitHub. Автоматической установки нет: установщик нужно скачать и запустить вручную.',
    checkingTitle: 'Проверяем обновления…',
    checkingHint: 'Запрашиваем последний релиз на GitHub.',
    availableTitle: 'Доступна новая версия {version}',
    availableHint:
      'У вас {current}. Скачайте установщик на странице релизов и запустите его — данные и настройки сохранятся.',
    latestTitle: 'У вас последняя версия',
    latestHint: 'Версия {version} — самая свежая.',
    errorTitle: 'Не удалось проверить обновления',
    errorHint: 'Проверьте подключение к интернету и попробуйте снова.',
    idleTitle: 'Проверка ещё не выполнялась',
    idleHint: 'Текущая версия {version}.',
    releases: 'Страница релизов',
    checkYourself: 'Проверить самому',
    checkedAt: 'Проверено {date}',
    notChecked: 'Проверка не выполнялась',
    checking: 'Проверяем…',
    checkAgain: 'Проверить снова'
  },
  errors: {
    network: 'Не удалось связаться с GitHub',
    timeout: 'Истекло время ожидания ответа GitHub',
    http: 'GitHub ответил с кодом {status}',
    badVersion: 'GitHub вернул релиз без понятного номера версии'
  }
}
