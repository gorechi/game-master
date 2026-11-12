export type Route =
  | { name: 'players' }
  | { name: 'player'; id: string; from: 'players' | 'characters' }
  | { name: 'characters' }
  | { name: 'monsters' }
  | { name: 'settings' }
