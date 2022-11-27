import { observer, Observer } from 'mobx-react'
import { Header } from '../../components/UI'
import React from 'react'
import { useTranslation } from 'react-i18next'
import GamesSection from './components/GamesSection'
import useFetchLibraryPaginated from '../../hooks/useFetchLibraryPaginated'
import useGlobalStore from '../../hooks/useGlobalStore'
import LibraryHeader from './components/LibraryHeader'
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
  const pagination = useFetchLibraryPaginated({
    isFavourite: true,
    termBox: libraryController.search,
    rpp: 10
  })

  return (
    <GamesSection
      pagination={pagination}
      listController={libraryController.mainLibrary}
      title={getLibraryTitle(libraryController.category.get(), t)}
    />
  )
}

const FavouriteList = () => {
  const { t } = useTranslation()
  const { libraryController } = useGlobalStore()
  const pagination = useFetchLibraryPaginated({
    isFavourite: true,
    termBox: libraryController.search,
    rpp: 10
  })

  return (
    <GamesSection
      pagination={pagination}
      listController={libraryController.favouritesLibrary}
      title={t('favourites', 'Favourites')}
    />
  )
}

export default observer(Library)
