import {
  faArrowDownAZ,
  faArrowDownZA,
  faBorderAll,
  faHardDrive as hardDriveSolid,
  faList,
  faSyncAlt
} from '@fortawesome/free-solid-svg-icons'
import { faHardDrive as hardDriveLight } from '@fortawesome/free-regular-svg-icons'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import FormControl from '../FormControl'
import './index.css'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import classNames from 'classnames'

type Layout = 'grid' | 'list'

interface Props {
  sortDescending: boolean
  sortInstalled: boolean
  toggleSortDescending: () => void
  toggleSortinstalled: () => void
  layout: Layout
  setLayout: (val: Layout) => void
  refresh: () => void
  refreshing: boolean
  showHidden: boolean
  setShowHidden: (val: boolean) => void
}

export default React.memo(function ActionIcons({
  sortDescending,
  toggleSortDescending,
  sortInstalled,
  layout,
  setLayout,
  toggleSortinstalled,
  refresh,
  refreshing,
  showHidden,
  setShowHidden
}: Props) {
  const { t } = useTranslation()

  const toggleShowHidden = useCallback(() => {
    setShowHidden(!showHidden)
  }, [showHidden])

  const showHiddenTitle = showHidden
    ? t('header.ignore_hidden', 'Ignore Hidden')
    : t('header.show_hidden', 'Show Hidden')

  return (
    <div className="ActionIcons">
      <FormControl segmented small>
        {layout === 'grid' ? (
          <button
            className={classNames('FormControl__button', {
              active: layout === 'grid'
            })}
            title={t('library.toggleLayout.list', 'Toggle to a list layout')}
            onClick={() => setLayout('list')}
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
            onClick={() => setLayout('grid')}
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
        {/*<button*/}
        {/*  className={classNames('FormControl__button', {*/}
        {/*    active: showFavourites*/}
        {/*  })}*/}
        {/*  title={showFavouritesTitle}*/}
        {/*  onClick={toggleShowFavourites}*/}
        {/*>*/}
        {/*  <FontAwesomeIcon*/}
        {/*    className="FormControl__segmentedFaIcon"*/}
        {/*    icon={faHeart}*/}
        {/*  />*/}
        {/*</button>*/}
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
          onClick={() => refresh()}
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
