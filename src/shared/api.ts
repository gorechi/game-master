import type { Player, PlayerInput } from './player'
import type { CharacterProfile, CharacterProfileInput } from './characterProfile'
import type { Monster, MonsterInput } from './monster'
import type { Game, GameInput } from './game'
import type { GameStatus } from './gameStatus'
import type { GameMonsterEntry, GameMonsterInput } from './gameMonster'
import type { GameMap, GameMapInput } from './map'
import type { Realm, RealmInput } from './realm'
import type { PlaceType, PlaceTypeInput } from './placeType'
import type { AppSettings, SettingsPatch } from './settings'
import type { UpdateState } from './update'
import type {
  DataExportRequest,
  DataExportResult,
  DataImportFile,
  DataImportRequest,
  DataImportResult
} from './dataPack'
import type {
  BackupFileSelection,
  BackupManualResult,
  BackupRestoreRequest,
  BackupRestoreResult,
  BackupSettings,
  BackupSettingsPatch
} from './backup'

/**
 * Контракт между renderer и main. Единственный источник правды для
 * имён IPC-каналов и типов запросов/ответов.
 */
export const IPC = {
  appInfo: 'app:info',
  appOpenDataFolder: 'app:open-data-folder',
  updatesCheck: 'updates:check',
  gamesList: 'games:list',
  gameCreate: 'game:create',
  gameUpdate: 'game:update',
  gameRemove: 'game:remove',
  gameFinish: 'game:finish',
  gameSetStatus: 'game:set-status',
  gameMonstersList: 'game-monsters:list',
  gameMonsterCreate: 'game-monsters:create',
  gameMonsterUpdate: 'game-monsters:update',
  gameMonsterRemove: 'game-monsters:remove',
  playersList: 'players:list',
  playerCreate: 'player:create',
  playerUpdate: 'player:update',
  playerRemove: 'player:remove',
  charactersList: 'characters:list',
  characterCreate: 'character:create',
  characterUpdate: 'character:update',
  characterRemove: 'character:remove',
  monstersList: 'monsters:list',
  monsterCreate: 'monster:create',
  monsterUpdate: 'monster:update',
  monsterRemove: 'monster:remove',
  mapsList: 'maps:list',
  mapCreate: 'map:create',
  mapUpdate: 'map:update',
  mapRemove: 'map:remove',
  realmsList: 'realms:list',
  realmCreate: 'realm:create',
  realmUpdate: 'realm:update',
  realmRemove: 'realm:remove',
  placeTypesList: 'place-types:list',
  placeTypeCreate: 'place-types:create',
  placeTypeUpdate: 'place-types:update',
  placeTypeRemove: 'place-types:remove',
  dataExport: 'data:export',
  dataChooseImportFile: 'data:choose-import-file',
  dataImport: 'data:import',
  backupSave: 'backup:save',
  backupChooseFile: 'backup:choose-file',
  backupRestore: 'backup:restore',
  backupGetSettings: 'backup:get-settings',
  backupChooseFolder: 'backup:choose-folder',
  backupUpdateSettings: 'backup:update-settings',
  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update'
} as const

export interface AppInfo {
  name: string
  version: string
  electron: string
  chrome: string
  platform: 'win32' | 'darwin' | 'linux' | 'other'
  dataDir: string
}

export interface GameMasterApi {
  app: {
    info(): Promise<AppInfo>
    openDataFolder(): Promise<void>
  }
  /** Проверка новых версий на GitHub. Ничего не скачивает и не устанавливает. */
  updates: {
    check(): Promise<UpdateState>
  }
  /** Игры — основная сущность приложения. */
  games: {
    list(): Promise<Game[]>
    create(input: GameInput, realmId: string): Promise<Game>
    update(game: Game): Promise<Game>
    /** Удаляет игру. Монстры не сохраняются: выбор делается при завершении игры. */
    remove(id: string): Promise<void>
    /** Завершает игру, сохраняя выбранных монстров в игровую библиотеку. */
    finish(id: string, keepMonsterIds?: string[]): Promise<Game>
    /** Меняет статус игры с проверкой допустимого перехода. */
    setStatus(id: string, status: GameStatus): Promise<Game>
  }
  /** Уникальные игровые монстры: сохранённые из игр и созданные вручную. */
  gameMonsters: {
    list(): Promise<GameMonsterEntry[]>
    create(input: GameMonsterInput, realmId: string): Promise<GameMonsterEntry>
    update(entry: GameMonsterEntry): Promise<GameMonsterEntry>
    remove(id: string): Promise<void>
  }
  /** Общая база игроков-людей. */
  players: {
    list(): Promise<Player[]>
    create(input: PlayerInput): Promise<Player>
    update(player: Player): Promise<Player>
    remove(id: string): Promise<void>
  }
  /** Персонажи: у игрока их может быть несколько. */
  characters: {
    list(): Promise<CharacterProfile[]>
    create(input: CharacterProfileInput, realmId: string): Promise<CharacterProfile>
    update(profile: CharacterProfile): Promise<CharacterProfile>
    remove(id: string): Promise<void>
  }
  /** Бестиарий: монстры с характеристиками и способностями. */
  monsters: {
    list(): Promise<Monster[]>
    create(input: MonsterInput, realmId: string): Promise<Monster>
    update(monster: Monster): Promise<Monster>
    remove(id: string): Promise<void>
  }
  /** Карты: пространства с местами и путями между ними. */
  maps: {
    /** Все карты или карты указанного сеттинга. */
    list(realmId?: string): Promise<GameMap[]>
    create(input: GameMapInput): Promise<GameMap>
    update(map: GameMap): Promise<GameMap>
    remove(id: string): Promise<void>
  }
  /** Сеттинги: верхнеуровневые миры, к которым привязаны игры и их сущности. */
  realms: {
    list(): Promise<Realm[]>
    create(input: RealmInput): Promise<Realm>
    update(realm: Realm): Promise<Realm>
    remove(id: string): Promise<void>
  }
  /** Иконки мест конкретного сеттинга: у каждого свой набор. */
  placeTypes: {
    list(realmId: string): Promise<PlaceType[]>
    create(input: PlaceTypeInput, realmId: string): Promise<PlaceType>
    update(placeType: PlaceType): Promise<PlaceType>
    remove(id: string): Promise<void>
  }
  /** Импорт и экспорт данных пакетами `.gmpack`. */
  data: {
    /** Собирает пакет и сохраняет его через системный диалог. */
    exportPackage(request: DataExportRequest): Promise<DataExportResult | null>
    /** Открывает файл, проверяет его и возвращает для предпросмотра. */
    chooseImportFile(): Promise<DataImportFile | null>
    /** Импортирует проверенный пакет в выбранный или новый сеттинг. */
    importPackage(request: DataImportRequest): Promise<DataImportResult>
  }
  /** Полный бэкап пользовательских данных и автобэкап. */
  backup: {
    /** Создаёт полный бэкап и предлагает сохранить его через системный диалог. */
    saveManual(): Promise<BackupManualResult | null>
    /** Открывает файл бэкапа и возвращает проверенные данные для подтверждения. */
    chooseFile(): Promise<BackupFileSelection | null>
    /** Заменяет текущие данные содержимым проверенного бэкапа. */
    restore(request: BackupRestoreRequest): Promise<BackupRestoreResult>
    getSettings(): Promise<BackupSettings>
    chooseFolder(): Promise<string | null>
    updateSettings(patch: BackupSettingsPatch): Promise<BackupSettings>
  }
  /** Настройки приложения (тема и прочее). */
  settings: {
    get(): Promise<AppSettings>
    update(patch: SettingsPatch): Promise<AppSettings>
  }
}
