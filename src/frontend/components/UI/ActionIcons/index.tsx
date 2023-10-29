import {
  faBorderAll,
  faList,
  faSyncAlt,
  faArrowDownAZ,
  faArrowDownZA,
  faHeart,
  faHardDrive as hardDriveSolid,
  faCircleXmark as circleXmarkSolid
} from '@fortawesome/free-solid-svg-icons'
import {
  faHardDrive as hardDriveLight,
  faCircleXmark as circleXmarkLight
} from '@fortawesome/free-regular-svg-icons'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import FormControl from '../FormControl'
import './index.css'
import { Runner } from 'common/types'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import classNames from 'classnames'
import LibraryContext from 'frontend/screens/Library/LibraryContext'

interface Props {
  library: Runner | 'all'
}

export default React.memo(function ActionIcons({ library }: Props) {
  const { t } = useTranslation()
  const { refreshLibrary, refreshing } = useContext(ContextProvider)

  const {
    handleLayout,
    layout,
    showHidden,
    setShowHidden,
    showFavourites,
    setShowFavourites,
    showNonAvailable,
    setShowNonAvailable,
    sortDescending,
    setSortDescending,
    sortInstalled,
    setSortInstalled
  } = useContext(LibraryContext)

  const showHiddenTitle = showHidden
    ? t('header.ignore_hidden', 'Ignore Hidden')
    : t('header.show_hidden', 'Show Hidden')

  const showFavouritesTitle = showFavourites
    ? t('header.show_all_games', 'Show all games')
    : t('header.show_favourites_only', 'Show Favourites only')

  const showNonAvailableTitle = showNonAvailable
    ? t('header.hide_non_available_games', 'Hide non-available games')
    : t('header.show_available_games', 'Show non-Available games')

  return (
    <div className="ActionIcons">
      <FormControl segmented small>
        {layout === 'grid' ? (
          <button
            className="FormControl__button"
            title={t('library.toggleLayout.list', 'Toggle to a list layout')}
            onClick={() => handleLayout('list')}
          >
            <FontAwesomeIcon
              className="FormControl__segmentedFaIcon"
              icon={faList}
            />
          </button>
        ) : (
          <button
            className="FormControl__button"
            title={t('library.toggleLayout.grid', 'Toggle to a grid layout')}
            onClick={() => handleLayout('grid')}
          >
            <FontAwesomeIcon
              className="FormControl__segmentedFaIcon"
              icon={faBorderAll}
            />
          </button>
        )}
        <button
          className="FormControl__button"
          title={
            sortDescending
              ? t('library.sortDescending', 'Sort Descending')
              : t('library.sortAscending', 'Sort Ascending')
          }
          onClick={() => setSortDescending(!sortDescending)}
        >
          <FontAwesomeIcon
            className="FormControl__segmentedFaIcon"
            icon={sortDescending ? faArrowDownZA : faArrowDownAZ}
          />
        </button>
        <button
          className="FormControl__button"
          title={t('library.sortByStatus', 'Sort by Status')}
          onClick={() => setSortInstalled(!sortInstalled)}
        >
          <FontAwesomeIcon
            className="FormControl__segmentedFaIcon"
            icon={sortInstalled ? hardDriveSolid : hardDriveLight}
          />
        </button>
        <button
          className={classNames('FormControl__button', {
            active: showFavourites
          })}
          title={showFavouritesTitle}
          onClick={() => setShowFavourites(!showFavourites)}
        >
          <FontAwesomeIcon
            className="FormControl__segmentedFaIcon"
            icon={faHeart}
          />
        </button>
        <button
          className="FormControl__button"
          title={showNonAvailableTitle}
          onClick={() => setShowNonAvailable(!showNonAvailable)}
        >
          <FontAwesomeIcon
            className="FormControl__segmentedFaIcon"
            icon={showNonAvailable ? circleXmarkSolid : circleXmarkLight}
          />
        </button>
        <button
          className="FormControl__button"
          title={showHiddenTitle}
          onClick={() => setShowHidden(!showHidden)}
        >
          {showHidden ? <Visibility /> : <VisibilityOff />}
        </button>
        <button
          className={classNames('FormControl__button', {
            active: refreshing
          })}
          title={t('generic.library.refresh', 'Refresh Library')}
          onClick={async () =>
            refreshLibrary({
              checkForUpdates: true,
              runInBackground: library === 'gog',
              library
            })
          }
        >
          <FontAwesomeIcon
            className={classNames('FormControl__segmentedFaIcon', {
              ['fa-spin']: refreshing
            })}
            icon={faSyncAlt}
          />
        </button>
      </FormControl>
    </div>
  )
})
