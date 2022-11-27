import { observer } from 'mobx-react'
import { Header } from '../../components/UI'
import React from 'react'
import { useTranslation } from 'react-i18next'
import GamesSection from './components/GamesSection'
import useFetchLibraryPaginated from '../../hooks/useFetchLibraryPaginated'
import useGlobalStore from '../../hooks/useGlobalStore'
import './index.css'
import { getLibraryTitle } from './constants'

const Library = () => {
  return (
    <>
      <Header />
      <div className="listing">
        <span id="top" />
        <FavouriteList />
        <MainLibrary />
      </div>
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
    showHiddenBox: mainLibrary.showHidden,
    rpp: 20
  })

  return (
    <GamesSection
      pagination={pagination}
      listController={mainLibrary}
      title={getLibraryTitle(libraryController.category.get(), t)}
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
