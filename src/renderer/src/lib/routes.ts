export type Route =
  | { name: 'games' }
  | { name: 'game'; id: string }
  | { name: 'players' }
  | { name: 'player'; id: string; from: 'players' | 'characters' }
  | { name: 'characters' }
  | { name: 'monsters' }
  | { name: 'maps' }
  | { name: 'map'; id: string }
  | { name: 'settings' }
