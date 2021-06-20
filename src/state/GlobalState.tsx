import React, { useCallback, useEffect, useState } from 'react'

import { GameInfo, GameStatus } from 'src/types'
import { IpcRenderer } from 'electron'
import {
  getGameInfo,
  getLegendaryConfig,
  getPlatform,
  getProgress,
  install,
  launch,
  notify
} from 'src/helpers'
import { useTranslation } from 'react-i18next'
import UpdateComponent from 'src/components/UI/UpdateComponent'

import ContextProvider from './ContextProvider'

const storage: Storage = window.localStorage
const { ipcRenderer } = window.require('electron')

const renderer: IpcRenderer = ipcRenderer

interface Props {
  children: React.ReactNode
}

function GlobalState({children}: Props) {
  const [category, setCategory] = useState('games')
  const [data, setData] = useState([] as GameInfo[])
  const [filter, setFilter] = useState('')
  const [error, setError] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [gameUpdates, setGameUpdates] = useState([] as string[])
  const [language, setlanguage] = useState('')
  const [layout, setLayout] = useState('grid')
  const [libraryStatus, setLibraryStatus] = useState([] as GameStatus[])
  const [platform, setPlatform] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [user, setUser] = useState('')
  const { t, i18n } = useTranslation(['gamepage, translations'])

  const refresh = useCallback(async (checkUpdates?: boolean): Promise<void> => {
    setRefreshing(true)
    const { user, library } = await getLegendaryConfig()
    const updates = checkUpdates ? await renderer.invoke('checkGameUpdates') : gameUpdates
    setData(library)
    setFilterText('')
    setGameUpdates(updates)
    setUser(user)
    setRefreshing(false)
  }, [gameUpdates])

  const refreshLibrary = useCallback(async (checkUpdates?: boolean): Promise<void> => {
    setRefreshing(true)
    await renderer.invoke('refreshLibrary')
    return refresh(checkUpdates)
  }, [refresh])

  const handleSearch = (input: string) => setFilterText(input)
  const handleFilter = (value: string) => setFilter((value))
  const handleError = (error: boolean) => setError(error)
  const handleLayout = (layout: string) => setLayout(layout)
  const handleCategory = (category: string) => setCategory(category)

  const filterLibrary = (library: GameInfo[], filter: string) => {
    if (filter.includes('UE_')) {
      return library.filter((game) => {
        if(!game.compatible_apps) {
          return false;
        }
        return game.compatible_apps.includes(filter)
      })

    } else {
      switch (filter) {
      case 'installed':
        return library.filter((game) => game.is_installed && game.is_game)
      case 'uninstalled':
        return library.filter((game) => !game.is_installed && game.is_game)
      case 'downloading':
        return library.filter((game) => {
          const currentApp = libraryStatus.filter(
            (app) => app.appName === game.app_name
          )[0]
          if (!currentApp || !game.is_game) {
            return false
          }
          return (
            currentApp.status === 'installing' ||
              currentApp.status === 'repairing' ||
              currentApp.status === 'updating' ||
               currentApp.status === 'moving'
          )
        })
      case 'updates':
        return library.filter(game => gameUpdates.includes(game.app_name))
      case 'unreal':
        return library.filter((game) => game.is_ue_project || game.is_ue_asset || game.is_ue_plugin)
      case 'asset':
        return library.filter((game) => game.is_ue_asset)
      case 'plugin':
        return library.filter((game) => game.is_ue_plugin)
      case 'project':
        return library.filter((game) => game.is_ue_project)
      default:
        return library.filter((game) => game.is_game)
      }
    }
  }

  const handleGameStatus = async ({ appName, status }: GameStatus) => {
    const currentApp =
      libraryStatus.filter((game) => game.appName === appName)[0] || {}

    const { title } = await getGameInfo(appName)

    if (currentApp && currentApp.status === status) {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      return setLibraryStatus([...updatedLibraryStatus, { ...currentApp }])
    }

    if (currentApp && currentApp.status === 'installing' && status === 'done') {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )

      setLibraryStatus(updatedLibraryStatus)

      const progress = await renderer.invoke('requestGameProgress', appName)
      const percent = getProgress(progress)

      if (percent) {
        const message =
          percent < 95
            ? t('translations:notify.install.canceled')
            : t('translations:notify.install.finished')
        notify([title, message])
        return refreshLibrary()
      }
      refreshLibrary()
      return notify([title, 'Game Imported'])
    }

    if (currentApp && currentApp.status === 'updating' && status === 'done') {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      const updatedGamesUpdates = gameUpdates.filter(game => game !== appName)
      setGameUpdates(updatedGamesUpdates)
      setLibraryStatus(updatedLibraryStatus)

      const progress = await renderer.invoke('requestGameProgress', appName)
      const percent = getProgress(progress)
      const message =
        percent < 95 ? t('translations:notify.update.canceled') : t('translations:notify.update.finished')
      notify([title, message])
      return refresh()
    }

    if (currentApp && currentApp.status === 'repairing' && status === 'done') {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      setLibraryStatus(updatedLibraryStatus)
      notify([title, t('translations:notify.finished.reparing')])

      return refresh()
    }

    if (
      currentApp &&
      currentApp.status === 'uninstalling' &&
      status === 'done'
    ) {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      setLibraryStatus(updatedLibraryStatus)
      notify([title, t('translations:notify.uninstalled')])

      return refreshLibrary()
    }

    if (currentApp && currentApp.status === 'moving' && status === 'done') {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      setLibraryStatus(updatedLibraryStatus)
      notify([title, t('translations:notify.moved')])

      return refresh()
    }

    if (status === 'done') {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      return setLibraryStatus(updatedLibraryStatus)

    }

    setLibraryStatus([...libraryStatus, { appName, status }])
  }

  const checkVersion = useCallback(async () => {
    const newVersion = await renderer.invoke('checkVersion')
    console.log({newVersion});

    if (newVersion) {
      const { response } = await ipcRenderer.invoke('openMessageBox', {
        buttons: [t('box.yes'), t('box.no')],
        message: t(
          'box.appupdate.message',
          'There is a new version of Heroic Available, do you want to update now?'
        ),
        title: t('box.appupdate.title', 'Update Available')
      })

      if (response === 0) {
        renderer.send('openReleases')
      }
    }
  }, [t])

  // Deals launching from protocol. Also checks if the game is already running
  ipcRenderer.once('launchGame', async (e, appName) => {
    const currentApp = libraryStatus.filter(game => game.appName === appName)[0]
    if (!currentApp) {
      await handleGameStatus({ appName, status: 'playing' })
      return launch({appName, handleGameStatus, t})
    }
  })

  ipcRenderer.once('installGame', async (e, appName) => {
    const currentApp = libraryStatus.filter(game => game.appName === appName)[0]
    if (!currentApp || currentApp && currentApp.status !== 'installing') {
      await handleGameStatus({ appName, status: 'installing' })
      return install({appName, handleGameStatus: handleGameStatus,
        installPath: 'default', isInstalling: false, previousProgress: null, progress: {
          bytes: '0.00MiB',
          eta: '00:00:00',
          percent: '0.00%'
        }, t})
    }
  })

  useEffect(() => {
    if (!gameUpdates.length){
      const storedGameUpdates = JSON.parse(storage.getItem('updates') || '[]')
      setGameUpdates(storedGameUpdates)
    }
    const checkVer = setTimeout(() => {
      checkVersion()
    }, 4500)
    return () => {
      return clearInterval(checkVer)
    }
  }, [checkVersion, gameUpdates.length])

  useEffect(() => {
    async function effect(){
      const platform = await getPlatform()
      const category = storage.getItem('category') || 'games'
      const filter = storage.getItem('filter') || 'all'
      const layout = storage.getItem('layout') || 'grid'
      const storedLanguage = storage.getItem('language') || language || 'en'
      i18n.changeLanguage(storedLanguage)
      setlanguage(storedLanguage)
      setFilter(filter)
      setCategory(category)
      setPlatform(platform)
      setLayout(layout)
    }
    effect()
  }, [i18n, language, platform])

  useEffect(() => {
    storage.setItem('category', category)
    storage.setItem('filter', filter)
    storage.setItem('layout', layout)
    storage.setItem('updates', JSON.stringify(gameUpdates))
    const pendingOps = libraryStatus.filter((game) => game.status !== 'playing')
      .length
    if (pendingOps) {
      renderer.send('lock')
    } else {
      renderer.send('unlock')
    }
  }, [category, filter, gameUpdates, layout, libraryStatus])

  async function init() {
    setRefreshing(true)
    const { user, library } = await getLegendaryConfig()
    const updates = await renderer.invoke('checkGameUpdates')
    setData(library)
    setFilterText('')
    setGameUpdates(updates)
    setUser(user)
    setRefreshing(false)
  }

  useEffect(() => {
    init()
  }, [])

  if (refreshing) {
    return <UpdateComponent />
  }


  const filterRegex = new RegExp(String(filterText), 'i')
  const textFilter = ({ title }: GameInfo) => filterRegex.test(title)
  const filteredLibrary = filterLibrary(data, filter).filter(textFilter)

  return (
    <ContextProvider.Provider
      value={{
        category,
        data: filteredLibrary,
        error,
        filter,
        gameUpdates,
        handleCategory,
        handleError,
        handleFilter,
        handleGameStatus,
        handleLayout,
        handleSearch,
        layout,
        libraryStatus,
        platform,
        refresh,
        refreshLibrary,
        refreshing,
        user
      }}
    >
      {children}
    </ContextProvider.Provider>
  )
}

export default React.memo(GlobalState)
