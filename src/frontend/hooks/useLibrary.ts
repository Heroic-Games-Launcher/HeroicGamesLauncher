import { Category } from 'frontend/types'
import React from 'react'

import { GameInfo, InstalledInfo } from 'common/types'
import {
  gogLibraryStore,
  gogInstalledGamesStore,
  sideloadLibrary,
  libraryStore
} from 'frontend/helpers/electronStores'

type Props = {
  category: Category
}

const useLibrary = ({ category }: Props): Array<GameInfo> => {
  const [library, setLibrary] = React.useState<Array<GameInfo>>([])
  const [gogLibrary, setGogLibrary] = React.useState<Array<GameInfo>>([])
  const [epicLibrary, setEpicLibrary] = React.useState<Array<GameInfo>>([])
  const [sideloadedLibrary, setSideloadedLibrary] = React.useState<
    Array<GameInfo>
  >([])

  const getGogLibrary = (): Array<GameInfo> => {
    const games = gogLibraryStore.get('games', []) as GameInfo[]
    const installedGames = gogInstalledGamesStore.get(
      'installed',
      []
    ) as Array<InstalledInfo>
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

  React.useEffect(() => {
    setGogLibrary(getGogLibrary())
    setEpicLibrary(libraryStore.get('library', []) as GameInfo[])
    setSideloadedLibrary(sideloadLibrary.get('games', []) as GameInfo[])
  }, [])

  React.useEffect(() => {
    switch (category) {
      case 'all':
        setLibrary([...gogLibrary, ...epicLibrary, ...sideloadedLibrary])
        break
      case 'gog':
        setLibrary(gogLibrary)
        break
      case 'legendary':
        setLibrary(epicLibrary)
        break
      case 'sideload':
        setLibrary(sideloadedLibrary)
        break
    }
  }, [gogLibrary, epicLibrary, sideloadedLibrary, category])

  return library
}

export default useLibrary
