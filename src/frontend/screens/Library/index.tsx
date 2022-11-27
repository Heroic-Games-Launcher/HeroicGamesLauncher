import './index.css'
import { observer } from 'mobx-react'
import { Header } from '../../components/UI'
import React from 'react'
import { useTranslation } from 'react-i18next'
import GamesSection from './components/GamesSection'
import useFetchLibraryPaginated from '../../hooks/useFetchLibraryPaginated'
import useGlobalStore from '../../hooks/useGlobalStore'
import { getLibraryTitle } from './constants'
import { InstallModal } from './components'

const Library = () => {
  const { requestInstallModal } = useGlobalStore()
  return (
    <>
      <Header />
      <div className="listing">
        <span id="top" />
        <RecentGames />
        <FavouriteList />
        <MainLibrary />
      </div>

      {requestInstallModal.opened && (
        <InstallModal
          runner={'legendary'}
          backdropClick={() => requestInstallModal.cancelRequest()}
        />
      )}
    </>
  )
}

const MainLibrary = () => {
  const { t } = useTranslation()
  const { libraryController } = useGlobalStore()
  const { mainLibrary } = libraryController
  const pagination = useFetchLibraryPaginated({
    termBox: libraryController.search,
    sortBox: mainLibrary.sort,
    categoryBox: libraryController.category,
    platformBox: libraryController.platform,
    showHiddenBox: mainLibrary.showHidden,
    rpp: 20
  })

  return (
    <GamesSection
      pagination={pagination}
      listController={mainLibrary}
      title={getLibraryTitle(libraryController.category.get(), t)}
      expanded
    />
  )
}

const RecentGames = () => {
  const { t } = useTranslation()
  const { libraryController } = useGlobalStore()
  const { recentGames } = libraryController
  const pagination = useFetchLibraryPaginated({
    onlyRecent: true,
    termBox: libraryController.search,
    sortBox: recentGames.sort,
    categoryBox: libraryController.category,
    platformBox: libraryController.platform,
    showHiddenBox: recentGames.showHidden,
    rpp: 20
  })

  return (
    <GamesSection
      pagination={pagination}
      listController={recentGames}
      title={t('Recent', 'Played Recently')}
      isRecent
    />
  )
}

const FavouriteList = () => {
  const { t } = useTranslation()
  const { libraryController } = useGlobalStore()
  const { favouritesLibrary } = libraryController
  const pagination = useFetchLibraryPaginated({
    onlyFavourites: true,
    categoryBox: libraryController.category,
    termBox: libraryController.search,
    sortBox: favouritesLibrary.sort,
    showHiddenBox: favouritesLibrary.showHidden,
    platformBox: libraryController.platform,
    rpp: 20
  })

  return (
    <GamesSection
      pagination={pagination}
      listController={favouritesLibrary}
      title={t('favourites', 'Favourites')}
    />
  )
}

export default observer(Library)
