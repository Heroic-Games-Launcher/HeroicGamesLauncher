import {
  faBorderAll,
  faList,
  faSyncAlt,
  faArrowDownAZ,
  faArrowDownZA,
  faHeart,
  faHardDrive as hardDriveSolid
} from '@fortawesome/free-solid-svg-icons'
import { faHardDrive as hardDriveLight } from '@fortawesome/free-regular-svg-icons'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useCallback, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import FormControl from '../FormControl'
import './index.css'
import { Runner } from 'common/types'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import classNames from 'classnames'

interface Props {
  sortDescending: boolean
  sortInstalled: boolean
  toggleSortDescending: () => void
  toggleSortinstalled: () => void
  library: Runner | 'all'
}

export default React.memo(function ActionIcons({
  library,
  sortDescending,
  toggleSortDescending,
  sortInstalled,
  toggleSortinstalled
}: Props) {
  const { t } = useTranslation()
  const {
    refreshLibrary,
    handleLayout,
    layout,
    showHidden,
    setShowHidden,
    showFavourites,
    refreshing,
    setShowFavourites
  } = useContext(ContextProvider)

  const toggleShowHidden = useCallback(() => {
    setShowHidden(!showHidden)
  }, [showHidden])

  const toggleShowFavourites = useCallback(() => {
    setShowFavourites(!showFavourites)
  }, [showFavourites])

  const showHiddenTitle = showHidden
    ? t('header.ignore_hidden', 'Ignore Hidden')
    : t('header.show_hidden', 'Show Hidden')

  const showFavouritesTitle = showFavourites
    ? t('header.show_all_games', 'Show all games')
    : t('header.show_favourites_only', 'Show Favourites only')

  return (
    <div className="ActionIcons">
      <FormControl segmented small>
        {layout === 'grid' ? (
          <button
            className={classNames('FormControl__button', {
              active: layout === 'grid'
            })}
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
            className={classNames('FormControl__button')}
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
          className={classNames('FormControl__button', {
            active: !sortDescending
          })}
          title={
            sortDescending
              ? t('library.sortDescending', 'Sort Descending')
              : t('library.sortAscending', 'Sort Ascending')
          }
          onClick={() => toggleSortDescending()}
        >
          <FontAwesomeIcon
            className="FormControl__segmentedFaIcon"
            icon={sortDescending ? faArrowDownZA : faArrowDownAZ}
          />
        </button>
        <button
          className={classNames('FormControl__button', {
            active: sortInstalled
          })}
          title={t('library.sortByStatus', 'Sort by Status')}
          onClick={() => toggleSortinstalled()}
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
          onClick={toggleShowFavourites}
        >
          <FontAwesomeIcon
            className="FormControl__segmentedFaIcon"
            icon={faHeart}
          />
        </button>
        <button
          className={classNames('FormControl__button', { active: showHidden })}
          title={showHiddenTitle}
          onClick={toggleShowHidden}
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
              fullRefresh: true,
              runInBackground: false,
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
