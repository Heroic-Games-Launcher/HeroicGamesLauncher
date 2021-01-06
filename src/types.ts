export interface Game {
  art_cover: string,
  art_square: string,
  app_name: string, 
  executable: string, 
  title: string, 
  version: string, 
  save_path: string, 
  install_size: number, 
  install_path: string,
  developer: string,
  isInstalled: boolean
}

export interface ContextType {
  user: string
  data: Game[]
  installing: string[]
  playing: string[]
  refreshing: boolean
  error: boolean
  refresh: () => void
  handleInstalling: (game: string) => void
  handlePlaying?: (game: string) => void
}