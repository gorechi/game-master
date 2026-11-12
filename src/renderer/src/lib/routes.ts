export type Route =
  | { name: 'players' }
  | { name: 'characters' }
  | { name: 'campaigns' }
  | { name: 'campaign'; id: string }
  | { name: 'settings' }
