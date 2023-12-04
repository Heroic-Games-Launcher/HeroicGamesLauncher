import React, { useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import ActionIcons from 'frontend/components/UI/ActionIcons'
import { GameInfo } from 'common/types'
import LibraryContext from '../../LibraryContext'
import './index.css'

type Props = {
  list: GameInfo[]
  handleAddGameButtonClick: () => void
}

export default React.memo(function LibraryHeader({
  list,
  handleAddGameButtonClick
}: Props) {
  const { t } = useTranslation()
  const { showFavourites } = useContext(LibraryContext)

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
  }, [list])

  return (
    <h5 className="libraryHeader">
      <div className="libraryHeaderWrapper">
        <span className="libraryTitle">
          {showFavourites
            ? t('favourites', 'Favourites')
            : t('title.allGames', 'All Games')}
          <span className="numberOfgames">{numberOfGames}</span>
          <button
            className="sideloadGameButton"
            onClick={handleAddGameButtonClick}
          >
            {t('add_game', 'Add Game')}
          </button>
        </span>
        <ActionIcons />
      </div>
    </h5>
  )
})
