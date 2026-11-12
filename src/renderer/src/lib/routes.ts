export type Route =
  | { name: 'players' }
  | { name: 'campaigns' }
  | { name: 'campaign'; id: string }
