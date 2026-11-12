# Game Master

Десктопное приложение для ведения партии D&D: инициатива, состав группы, заметки мастера.
Работает полностью офлайн, данные лежат обычными JSON-файлами на диске пользователя.

> Статус: рабочий каркас (MVP). Архитектура рассчитана на развитие, а не на одноразовый прототип.

## Что уже работает

- **Библиотека кампаний** — создание, открытие, удаление в корзину, показ файла в проводнике.
- **Трекер инициативы** — ручной ввод и броски d20, автоматическая сортировка, раунды,
  ход вперёд/назад, хиты (±1/±5), КД, состояния (ослеплён, сбит с ног и т.д.).
- **Группа** — персонажи игроков, NPC и монстры; кнопка «В бой» переносит бойца в энкаунтер.
- **Заметки кампании** — свободный текст.
- **Автосохранение** — дебаунс 500 мс, индикатор состояния, принудительная дозапись при закрытии окна.

## Стек

| Слой | Решение | Почему |
| --- | --- | --- |
| Оболочка | **Electron 45** | Единый код для Windows и macOS, зрелая сборка инсталляторов, нет требования ставить Rust |
| Сборка | **electron-vite 6** + Vite 7 | Быстрый dev-сервер с HMR, готовые три сборки (main/preload/renderer) |
| UI | **React 19 + TypeScript** | Предсказуемая экосистема, строгая типизация |
| Валидация | **zod** | Не доверяем содержимому файлов и IPC: схема проверяется в главном процессе |
| Инсталляторы | **electron-builder 26** | NSIS для Windows, DMG/ZIP для macOS (x64 + arm64) |
| Хранение | **JSON-файлы** | Прозрачно, легко бэкапить и шарить, не требует нативных модулей |

## Архитектура

```
┌──────────────────────── main (Node) ────────────────────────┐
│  окно, меню, жизненный цикл        storage/campaignStore    │
│  ipc.ts — валидация и маршрутизация    атомарная запись      │
└───────────────▲─────────────────────────────┬───────────────┘
                │ IPC (invoke/handle)         │ fs
┌───────────────┴───────────┐        ┌────────▼─────────┐
│ preload: мост contextBridge│        │ <userData>/      │
│ window.gameMaster         │        │  campaigns/*.json│
└───────────────▲───────────┘        └──────────────────┘
                │
┌───────────────┴───────────────────────────────────────────┐
│ renderer: React, без доступа к Node и файловой системе    │
└───────────────────────────────────────────────────────────┘
```

Ключевые решения:

- **Изоляция процессов.** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
  Renderer видит только типизированный мост `window.gameMaster`; CSP включается в собранной версии.
- **Контракт IPC в одном месте** — `src/shared/api.ts` (имена каналов + типы запросов/ответов).
- **Домен отделён от схем.** `src/shared/domain.ts` — типы, фабрики, подписи (без зависимостей).
  `src/shared/campaign.ts` — zod-схемы и миграции, грузится только в main.
  Renderer импортирует из `campaign.ts` **только типы** (`import type`), поэтому zod не попадает в бандл окна.
- **Атомарная запись.** Пишем во временный файл и делаем `rename` поверх целевого — обрыв питания
  не оставит полузаписанный JSON. Записи одного файла сериализуются очередью.
- **Версия формата.** В каждом файле есть `schemaVersion`; чтение идёт через `migrateCampaign()`,
  где будут накапливаться шаги миграции.
- **Безопасное удаление.** Файл отправляется в системную корзину, а не удаляется безвозвратно.
- **Аккуратное закрытие.** main перехватывает `close`/`before-quit`, просит renderer дописать
  несохранённое и только потом отпускает окно (с таймаутом 2,5 с на случай зависания).

## Структура проекта

```
build/                     иконка-исходник и entitlements для macOS
scripts/generate-icon.mjs  генерация build/icon.png без зависимостей
electron.vite.config.ts    сборка Electron (main/preload/renderer)
vite.web.config.ts         браузерный предпросмотр без Electron
src/
  main/                    главный процесс
    index.ts               жизненный цикл, CSP, внешние ссылки, single instance
    window.ts              окно и протокол закрытия
    ipc.ts                 обработчики IPC (валидируют вход)
    storage/campaignStore.ts  чтение/запись кампаний на диск
  preload/index.ts         contextBridge → window.gameMaster
  renderer/                React-приложение
    src/components/        Library, CampaignView, InitiativeBoard, PartyRoster, NotesEditor
    src/hooks/             useCampaignSession (загрузка + автосохранение)
    src/lib/               доступ к API, веб-адаптер, форматирование
    src/styles.css         тема и вёрстка
  shared/                  код, общий для main и renderer
    api.ts                 контракт IPC
    campaign.ts            zod-схемы, миграции
    domain.ts              типы, фабрики, подписи
    initiative.ts          порядок хода, броски, состояния
```

## Разработка

Требуется Node.js 22.12+ (в CI используется 24).

```bash
npm install
npm run dev        # dev-сервер + Electron с HMR
npm run dev:web    # только интерфейс в браузере (http://localhost:5180)
npm run typecheck  # проверка типов main и renderer
npm run build      # production-сборка в out/
npm run icons      # перегенерировать build/icon.png
```

### Веб-предпросмотр

`npm run dev:web` поднимает только renderer — без Electron. UI работает на том же контракте
`GameMasterApi`, но вместо IPC подставляется адаптер на `localStorage`
(`src/renderer/src/lib/webBridge.ts`).

- данные живут в браузере, файлов на диске нет;
- кнопка «Сбросить данные» на главном экране очищает предпросмотр;
- это режим для быстрой проверки интерфейса — реальные кампании хранит только десктопная версия.

Данные dev-сборки хранятся отдельно от рабочих: `…/Game Master (dev)/campaigns`.

### Если Electron не запускается после `npm install`

Новые версии npm могут не выполнять install-скрипты пакетов без явного разрешения.
Если папки `node_modules/electron/dist` нет, выполните:

```bash
node node_modules/electron/install.js
```

## Сборка установщиков

```bash
npm run dist:win   # NSIS: x64 и arm64
npm run dist:mac   # DMG + ZIP: x64 и arm64 (только на macOS)
npm run pack       # распакованное приложение без инсталлятора
```

Готовые файлы появляются в `release/<version>/`:

- `game-master-setup-<version>-x64.exe` / `-arm64.exe` — установщик Windows;
- `game-master-<version>-<arch>.dmg` — образ для macOS;
- `game-master-<version>-<arch>.zip` — архив (удобно для автообновления).

Сборка `.dmg` возможна только на macOS — для этого есть
`.github/workflows/build.yml`: он собирает инсталляторы на `windows-latest` и `macos-latest`
и складывает их в артефакты.

### Подпись и нотаризация

Сейчас сборки **неподписанные**: Windows покажет предупреждение SmartScreen, macOS — Gatekeeper
(приложение можно открыть через «Продолжить» в настройках безопасности).

Чтобы подписывать:

- **Windows:** сертификат Code Signing → `CSC_LINK` (путь или base64) и `CSC_KEY_PASSWORD`;
- **macOS:** Apple Developer ID → `CSC_LINK`, `CSC_KEY_PASSWORD`, а для нотаризации —
  `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` и `mac.notarize: true` в `electron-builder.yml`.

## Где лежат данные

| ОС | Путь |
| --- | --- |
| Windows | `%APPDATA%\Game Master\campaigns\` |
| macOS | `~/Library/Application Support/Game Master/campaigns/` |

Открыть папку можно кнопкой «Папка с кампаниями» на главном экране.

## Формат файла кампании

Одна кампания — один файл `<uuid>.json`:

```json
{
  "schemaVersion": 1,
  "id": "0f0b6a6e-…",
  "name": "Проклятие Страда",
  "createdAt": "2026-11-12T10:00:00.000Z",
  "updatedAt": "2026-11-12T12:34:56.000Z",
  "notes": "Текст заметок",
  "characters": [
    { "id": "chr1", "name": "Ария", "kind": "pc", "subtitle": "Плут 5",
      "initiativeBonus": 4, "armorClass": 16, "maxHp": 38, "notes": "" }
  ],
  "encounter": {
    "id": "enc1", "name": "Бой", "status": "running", "round": 2,
    "activeId": "cmb1",
    "combatants": [
      { "id": "cmb1", "characterId": "chr1", "name": "Ария",
        "initiative": 17, "initiativeBonus": 4, "armorClass": 16,
        "hpCurrent": 38, "hpMax": 38, "conditions": [], "notes": "", "isPlayer": true }
    ]
  }
}
```

Правила развития формата:

1. добавили поле — обновите zod-схему, фабрику в `domain.ts` и типы;
2. несовместимое изменение — увеличьте `CAMPAIGN_SCHEMA_VERSION` и добавьте шаг миграции
   в `migrateCampaign()`;
3. renderer не должен импортировать рантайм-значения из `campaign.ts` — только типы.

## Дальше по плану

- бросок кубиков с журналом и модификаторами;
- несколько энкаунтеров на кампанию и сохранение шаблонов боя;
- импорт/экспорт кампании одним файлом, обмен с игроками;
- бестиарий SRD и быстрый поиск монстров;
- горячие клавиши (следующий ход, урон), отмена действий;
- автообновление через `electron-updater`;
- второе окно «экран игроков»;
- unit-тесты для `shared/initiative.ts` и хранилища (Vitest).

## Лицензия

MIT.
