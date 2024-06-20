import React, { PureComponent } from 'react'

import { GameInfo, RefreshOptions, Runner } from 'common/types'
import { getGameInfo, getLegendaryConfig, launch, notify } from '../helpers'
import { t } from 'i18next'

import ContextProvider from './ContextProvider'

import {
  configStore,
  gogConfigStore,
  gogInstalledGamesStore,
  gogLibraryStore,
  libraryStore,
  nileConfigStore,
  nileLibraryStore
} from '../helpers/electronStores'
import { sideloadLibrary } from 'frontend/helpers/electronStores'
import { IpcRendererEvent } from 'electron'
import { NileRegisterData } from 'common/types/nile'
import { useGlobalState } from './GlobalStateV2'

const storage: Storage = window.localStorage

interface Props {
  children: React.ReactNode
}

interface StateProps {
  epic: {
    library: GameInfo[]
    username?: string
  }
  gog: {
    library: GameInfo[]
    username?: string
  }
  amazon: {
    library: GameInfo[]
    user_id?: string
    username?: string
  }
  refreshing: boolean
  refreshingInTheBackground: boolean
  sideloadedLibrary: GameInfo[]
}

class GlobalState extends PureComponent<Props> {
  loadGOGLibrary = (): Array<GameInfo> => {
    const games = gogLibraryStore.get('games', [])

    const installedGames = gogInstalledGamesStore.get('installed', [])
    for (const igame in games) {
      for (const installedGame of installedGames) {
        if (installedGame.appName === games[igame].app_name) {
          games[igame].install = installedGame
          games[igame].is_installed = true
        }
      }
    }

    return games
  }
  loadAmazonLibrary = (): Array<GameInfo> => {
    const games = nileLibraryStore.get('library', [])

    return games
  }
  state: StateProps = {
    epic: {
      library: libraryStore.get('library', []),
      username: configStore.get_nodefault('userInfo.displayName')
    },
    gog: {
      library: this.loadGOGLibrary(),
      username: gogConfigStore.get_nodefault('userData.username')
    },
    amazon: {
      library: this.loadAmazonLibrary(),
      user_id: nileConfigStore.get_nodefault('userData.user_id'),
      username: nileConfigStore.get_nodefault('userData.name')
    },
    refreshing: false,
    refreshingInTheBackground: true,
    sideloadedLibrary: sideloadLibrary.get('games', [])
  }

  handleSuccessfulLogin = (runner: Runner) => {
    storage.setItem('category', 'all')
    this.refreshLibrary({
      runInBackground: false,
      library: runner
    })
  }

  epicLogin = async (sid: string) => {
    console.log('logging epic')
    const response = await window.api.login(sid)

    if (response.status === 'done') {
      this.setState({
        epic: {
          library: [],
          username: response.data?.displayName
        }
      })

      this.handleSuccessfulLogin('legendary')
    }

    return response.status
  }

  epicLogout = async () => {
    this.setState({ refreshing: true })
    await window.api.logoutLegendary().finally(() => {
      this.setState({
        epic: {
          library: [],
          username: null
        }
      })
    })
    console.log('Logging out from epic')
    this.setState({ refreshing: false })
    window.location.reload()
  }

  gogLogin = async (token: string) => {
    console.log('logging gog')
    const response = await window.api.authGOG(token)

    if (response.status === 'done') {
      this.setState({
        gog: {
          library: [],
          username: response.data?.username
        }
      })

      this.handleSuccessfulLogin('gog')
    }

    return response.status
  }

  gogLogout = async () => {
    await window.api.logoutGOG()
    this.setState({
      gog: {
        library: [],
        username: null
      }
    })
    console.log('Logging out from gog')
    window.location.reload()
  }

  amazonLogin = async (data: NileRegisterData) => {
    console.log('logging amazon')
    const response = await window.api.authAmazon(data)

    if (response.status === 'done') {
      this.setState({
        amazon: {
          library: [],
          user_id: response.user?.user_id,
          username: response.user?.name
        }
      })

      this.handleSuccessfulLogin('nile')
    }

    return response.status
  }

  amazonLogout = async () => {
    await window.api.logoutAmazon()
    this.setState({
      amazon: {
        library: [],
        user_id: null,
        username: null
      }
    })
    console.log('Logging out from amazon')
    window.location.reload()
  }

  getAmazonLoginData = async () => window.api.getAmazonLoginData()

  refresh = async (
    library?: Runner | 'all',
    checkUpdates = false
  ): Promise<void> => {
    console.log('refreshing')

    await useGlobalState.getState().refresh(checkUpdates)

    const { epic, gog, amazon } = this.state

    const currentLibraryLength = epic.library?.length

    let epicLibrary = libraryStore.get('library', [])
    if (epic.username && (!epicLibrary.length || !epic.library.length)) {
      window.api.logInfo('No cache found, getting data from legendary...')
      const { library: legendaryLibrary } = await getLegendaryConfig()
      epicLibrary = legendaryLibrary
    }

    let gogLibrary = this.loadGOGLibrary()
    if (gog.username && (!gogLibrary.length || !gog.library.length)) {
      window.api.logInfo('No cache found, getting data from gog...')
      await window.api.refreshLibrary('gog')
      gogLibrary = this.loadGOGLibrary()
    }

    let amazonLibrary = nileLibraryStore.get('library', [])
    if (amazon.user_id && (!amazonLibrary.length || !amazon.library.length)) {
      window.api.logInfo('No cache found, getting data from nile...')
      await window.api.refreshLibrary('nile')
      amazonLibrary = this.loadAmazonLibrary()
    }

    const updatedSideload = sideloadLibrary.get('games', [])

    this.setState({
      epic: {
        library: epicLibrary,
        username: epic.username
      },
      gog: {
        library: gogLibrary,
        username: gog.username
      },
      amazon: {
        library: amazonLibrary,
        user_id: amazon.user_id,
        username: amazon.username
      },
      refreshing: false,
      refreshingInTheBackground: true,
      sideloadedLibrary: updatedSideload
    })

    if (currentLibraryLength !== epicLibrary.length) {
      window.api.logInfo('Force Update')
      this.forceUpdate()
    }
  }

  refreshLibrary = async ({
    checkForUpdates,
    runInBackground = true,
    library = undefined
  }: RefreshOptions): Promise<void> => {
    if (this.state.refreshing) return

    this.setState({
      refreshing: true,
      refreshingInTheBackground: runInBackground
    })
    window.api.logInfo(`Refreshing ${library} Library`)
    try {
      await window.api.refreshLibrary(library)
      return await this.refresh(library, checkForUpdates)
    } catch (error) {
      window.api.logError(`${error}`)
    }
  }

  refreshWineVersionInfo = async (fetch: boolean): Promise<void> => {
    if (platform === 'win32') {
      return
    }
    window.api.logInfo('Refreshing wine downloader releases')
    this.setState({ refreshing: true })
    await window.api
      .refreshWineVersionInfo(fetch)
      .then(() => {
        this.setState({
          refreshing: false
        })
        return
      })
      .catch(async () => {
        this.setState({ refreshing: false })
        window.api.logError('Sync with upstream releases failed')

        notify({
          title: 'Wine-Manager',
          body: t(
            'notify.refresh.error',
            "Couldn't fetch releases from upstream, maybe because of Github API restrictions! Try again later."
          )
        })
        return
      })
  }

  async componentDidMount() {
    const { epic, gog, amazon } = this.state

    // Deals launching from protocol. Also checks if the game is already running
    window.api.handleLaunchGame(
      async (
        e: IpcRendererEvent,
        appName: string,
        runner: Runner
      ): Promise<{ status: 'done' | 'error' | 'abort' }> => {
        const currentApp =
          useGlobalState.getState().libraryStatus[`${appName}_${runner}`]
        if (!currentApp) {
          return launch({
            appName,
            runner,
            hasUpdate: false
          })
        }
        return { status: 'error' }
      }
    )

    window.api.handleInstallGame(async (e, appName, runner) => {
      const currentApp =
        useGlobalState.getState().libraryStatus[`${appName}_${runner}`]
      if (!currentApp || (currentApp && currentApp.status !== 'installing')) {
        const gameInfo = await getGameInfo(appName, runner)
        if (!gameInfo || gameInfo.runner === 'sideload') {
          return
        }
        return this.setState({
          showInstallModal: {
            show: true,
            appName,
            runner,
            gameInfo
          }
        })
      }
    })

    window.api.handleRefreshLibrary((e, runner) => {
      this.refreshLibrary({
        checkForUpdates: false,
        runInBackground: true,
        library: runner
      })
    })

    window.api.handleGamePush((e: IpcRendererEvent, args: GameInfo) => {
      if (!args.app_name) return
      if (args.runner === 'gog') {
        const library = [...this.state.gog.library]
        const index = library.findIndex(
          (game) => game.app_name === args.app_name
        )
        if (index !== -1) {
          library[index] = args
        } else {
          library.push(args)
        }
        this.setState({
          gog: {
            library: [...library],
            username: this.state.gog.username
          }
        })
      }
    })

    const legendaryUser = configStore.has('userInfo')
    const gogUser = gogConfigStore.has('userData')
    const amazonUser = nileConfigStore.has('userData')

    if (legendaryUser) {
      await window.api.getUserInfo()
    }

    if (amazonUser) {
      await window.api.getAmazonUserInfo()
    }

    if (legendaryUser || gogUser || amazonUser) {
      this.refreshLibrary({
        checkForUpdates: true,
        runInBackground:
          epic.library.length !== 0 ||
          gog.library.length !== 0 ||
          amazon.library.length !== 0
      })
    }

    window.api.frontendReady()
  }

  render() {
    const { epic, gog, amazon } = this.state

    return (
      <ContextProvider.Provider
        value={{
          ...this.state,
          epic: {
            library: epic.library,
            username: epic.username,
            login: this.epicLogin,
            logout: this.epicLogout
          },
          gog: {
            library: gog.library,
            username: gog.username,
            login: this.gogLogin,
            logout: this.gogLogout
          },
          amazon: {
            library: amazon.library,
            user_id: amazon.user_id,
            username: amazon.username,
            getLoginData: this.getAmazonLoginData,
            login: this.amazonLogin,
            logout: this.amazonLogout
          },
          refresh: this.refresh,
          refreshLibrary: this.refreshLibrary,
          refreshWineVersionInfo: this.refreshWineVersionInfo
        }}
      >
        {this.props.children}
      </ContextProvider.Provider>
    )
  }
}

export default GlobalState
