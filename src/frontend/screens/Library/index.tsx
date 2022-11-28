import './index.css'
import { observer } from 'mobx-react'
import { Header } from '../../components/UI'
import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import GamesSection from './components/GamesSection'
import useGlobalStore from '../../hooks/useGlobalStore'
import { getLibraryTitle } from './constants'
import { InstallModal } from './components'

const Library = () => {
  const { requestInstallModal, libraryController } = useGlobalStore()
  const listingRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listingRef.current) {
      listingRef.current.scrollTo(libraryController.listScrollPosition.get())
    }
  }, [listingRef])

  return (
    <>
      <Header />

      <div
        className="listing"
        ref={listingRef}
        onScroll={(ev) => {
          const { scrollTop, scrollLeft } = ev.currentTarget
          libraryController.listScrollPosition.set({
            left: scrollLeft,
            top: scrollTop
          })
        }}
      >
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

  return (
    <GamesSection
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

  return (
    <GamesSection
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

  return (
    <GamesSection
      listController={favouritesLibrary}
      title={t('favourites', 'Favourites')}
    />
  )
}

export default observer(Library)
