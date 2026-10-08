import React, { useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import ActionIcons from 'frontend/components/UI/ActionIcons'
import Header from 'frontend/components/UI/Header'
import { GameInfo } from 'common/types'
import LibraryContext from '../../LibraryContext'
import './index.css'
import AddGameButton from '../AddGameButton'

type Props = {
  list: GameInfo[]
}

export default React.memo(function LibraryHeader({ list }: Props) {
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
    return total > 0 ? total : 0
  }, [list])

  return (
    <div className="libraryHeader" data-tour="library-header">
      <div className="libraryHeaderWrapper">
        <div className="libraryTitleBlock">
          <h5 className="libraryTitle">
            {showFavourites
              ? t('favourites', 'Favourites')
              : t('title.allGames', 'All Games')}
          </h5>
          <span className="numberOfgames">
            {t('library.gamesCount', {
              count: numberOfGames,
              defaultValue_one: '{{count}} game',
              defaultValue_other: '{{count}} games'
            })}
          </span>
        </div>
        <AddGameButton data-tour="library-add-game" />
      </div>
      <div className="libraryToolbar">
        <Header />
        <ActionIcons />
      </div>
    </div>
  )
})
