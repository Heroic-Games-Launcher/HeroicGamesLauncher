import React, { useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import ActionIcons from 'frontend/components/UI/ActionIcons'
import { epicCategories } from 'frontend/helpers/library'
import ContextProvider from 'frontend/state/ContextProvider'
import { GameInfo, SideloadGame } from 'common/types'
import { getLibraryTitle } from '../../constants'
import './index.css'

const storage = window.localStorage

type Props = {
  list: (GameInfo | SideloadGame)[]
  sortDescending: boolean
  sortInstalled: boolean
  setSortInstalled: (value: boolean) => void
  setSortDescending: (value: boolean) => void
  handleAddGameButtonClick: () => void
}

export default React.memo(function LibraryHeader({
  list,
  sortInstalled,
  sortDescending,
  setSortDescending,
  setSortInstalled,
  handleAddGameButtonClick
}: Props) {
  const { t } = useTranslation()
  const { category, showFavourites } = useContext(ContextProvider)

  const numberOfGames = useMemo(() => {
    if (!list) {
      return 0
    }
    // is_dlc is only applicable when the game is from legendary, but checking anyway doesn't cause errors and enable accurate counting in the 'ALL' game tab
    const dlcCount = list.filter(
      (lib) => lib.runner !== 'sideload' && lib.install.is_dlc
    ).length

    const total = list.length - dlcCount
    return total > 0 ? `${total}` : 0
  }, [list, category])

  function handleSortDescending() {
    setSortDescending(!sortDescending)
    storage.setItem('sortDescending', JSON.stringify(!sortDescending))
  }

  function handleSortInstalled() {
    setSortInstalled(!sortInstalled)
    storage.setItem('sortInstalled', JSON.stringify(!sortInstalled))
  }

  function getLibrary() {
    if (category === 'all') {
      return category
    }

    if (epicCategories.includes(category)) {
      return 'legendary'
    }

    if (category === 'sideload') {
      return 'sideload'
    }

    return 'gog'
  }

  return (
    <h5 className="libraryHeader">
      <div className="libraryHeaderWrapper">
        <span className="libraryTitle">
          {showFavourites
            ? t('favourites', 'Favourites')
            : `${getLibraryTitle(category, t)}`}
          <span className="numberOfgames">{numberOfGames}</span>
          <button
            className="sideloadGameButton"
            onClick={handleAddGameButtonClick}
          >
            {t('add_game', 'Add Game')}
          </button>
        </span>
        <ActionIcons
          sortDescending={sortDescending}
          toggleSortDescending={() => handleSortDescending()}
          sortInstalled={sortInstalled}
          library={getLibrary()}
          toggleSortinstalled={() => handleSortInstalled()}
        />
      </div>
    </h5>
  )
})
