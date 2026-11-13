export type Route =
  | { name: 'games' }
  | { name: 'game'; id: string }
  | { name: 'players' }
  | { name: 'player'; id: string; from: 'players' | 'characters' }
  | { name: 'characters' }
  | { name: 'monsters' }
  | { name: 'worlds' }
  | { name: 'world'; id: string }
  | { name: 'settings' }
