import type { Player, PlayerInput } from './player'
import type { CharacterProfile, CharacterProfileInput } from './characterProfile'
import type { Monster, MonsterInput } from './monster'
import type { Game, GameInput } from './game'
import type { GameStatus } from './gameStatus'
import type { GameMonsterEntry } from './gameMonster'
import type { AppSettings, SettingsPatch } from './settings'

/**
 * Контракт между renderer и main. Единственный источник правды для
 * имён IPC-каналов и типов запросов/ответов.
 */
export const IPC = {
  appInfo: 'app:info',
  appOpenDataFolder: 'app:open-data-folder',
  gamesList: 'games:list',
  gameCreate: 'game:create',
  gameUpdate: 'game:update',
  gameRemove: 'game:remove',
  gameFinish: 'game:finish',
  gameSetStatus: 'game:set-status',
  gameMonstersList: 'game-monsters:list',
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
  /** Игры — основная сущность приложения. */
  games: {
    list(): Promise<Game[]>
    create(input: GameInput): Promise<Game>
    update(game: Game): Promise<Game>
    /** Удаляет игру. Монстры не сохраняются: выбор делается при завершении игры. */
    remove(id: string): Promise<void>
    /** Завершает игру, сохраняя выбранных монстров в игровую библиотеку. */
    finish(id: string, keepMonsterIds?: string[]): Promise<Game>
    /** Меняет статус игры с проверкой допустимого перехода. */
    setStatus(id: string, status: GameStatus): Promise<Game>
  }
  /** Готовые игровые монстры, сохранённые из удалённых игр. */
  gameMonsters: {
    list(): Promise<GameMonsterEntry[]>
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
    create(input: CharacterProfileInput): Promise<CharacterProfile>
    update(profile: CharacterProfile): Promise<CharacterProfile>
    remove(id: string): Promise<void>
  }
  /** Бестиарий: монстры с характеристиками и способностями. */
  monsters: {
    list(): Promise<Monster[]>
    create(input: MonsterInput): Promise<Monster>
    update(monster: Monster): Promise<Monster>
    remove(id: string): Promise<void>
  }
  /** Настройки приложения (тема и прочее). */
  settings: {
    get(): Promise<AppSettings>
    update(patch: SettingsPatch): Promise<AppSettings>
  }
}
