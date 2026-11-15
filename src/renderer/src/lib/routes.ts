export type Route =
  | { name: 'games' }
  | { name: 'game'; id: string }
  | { name: 'players' }
  | { name: 'player'; id: string; from: 'players' | 'characters' }
  | { name: 'characters' }
  | { name: 'monsters' }
  | { name: 'savedMonsters' }
  | { name: 'realms' }
  | { name: 'realm'; id: string }
  | { name: 'maps' }
  | { name: 'map'; id: string }
  | { name: 'data' }
  | { name: 'settings' }
