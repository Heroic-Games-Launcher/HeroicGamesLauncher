import type {
  ButtonOptions,
  ConnectivityStatus,
  DialogType,
  DMQueueElement,
  DownloadManagerState,
  GameInfo,
  GameStatus,
  ProgressInfo,
  RecentGame,
  Runner,
  State
} from 'common/types'
import type { GameConfig, GlobalConfig } from 'backend/config/schemas'

type FrontendMessages = {
  gameStatusUpdate: (status: GameStatus) => void
  wineVersionsUpdated: () => void
  showDialog: (
    title: string,
    message: string,
    type: DialogType,
    buttons?: Array<ButtonOptions>
  ) => void
  changedDMQueueInformation: (
    elements: DMQueueElement[],
    state: DownloadManagerState
  ) => void
  maximized: () => void
  unmaximized: () => void
  fullscreen: (status: boolean) => void
  refreshLibrary: (runner?: Runner) => void
  openScreen: (screen: string) => void
  'connectivity-changed': (status: {
    status: ConnectivityStatus
    retryIn: number
  }) => void
  launchGame: (appName: string, runner: Runner) => void
  installGame: (appName: string, runner: Runner) => void
  recentGamesChanged: (newRecentGames: RecentGame[]) => void
  pushGameToLibrary: (info: GameInfo) => void
  progressOfWinetricks: (payload: {
    messages: string[]
    installingComponent: string
  }) => void
  'installing-winetricks-component': (component: string) => void

  globalConfigChanged: <Key extends keyof GlobalConfig>(
    key: Key,
    value: GlobalConfig[Key]
  ) => void
  globalConfigKeyReset: <Key extends keyof GlobalConfig>(
    key: Key,
    value: GlobalConfig[Key]
  ) => void
  gameConfigChanged: <Key extends keyof GameConfig>(
    appName: string,
    runner: Runner,
    key: Key,
    value: GameConfig[Key]
  ) => void
  gameConfigKeyReset: <Key extends keyof GameConfig>(
    appName: string,
    runner: Runner,
    key: Key,
    value: GameConfig[Key]
  ) => void
  gameConfigCleared: (appName: string, runner: Runner) => void

  [key: `progressUpdate${string}`]: (progress: GameStatus) => void
  [key: `progressOfWineManager${string}`]: (progress: {
    state: State
    progress?: ProgressInfo
  }) => void

  // Used inside tests, so we can be a bit lenient with the type checking here
  message: (...params: unknown[]) => void
}

export type { FrontendMessages }
