import {
  faBorderAll,
  faList,
  faSyncAlt,
  faArrowDownAZ,
  faArrowDownZA,
  faHardDrive as hardDriveSolid,
  faFilter,
  faFilterCircleXmark,
  faShuffle
} from '@fortawesome/free-solid-svg-icons'
import { faHardDrive as hardDriveLight } from '@fortawesome/free-regular-svg-icons'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import FormControl from '../FormControl'
import './index.css'
import classNames from 'classnames'
import LibraryContext from 'frontend/screens/Library/LibraryContext'
import TourButton from 'frontend/components/Tour/TourButton'
import { LIBRARY_TOUR_ID } from 'frontend/screens/Library/components/LibraryTour'
import { SortOptions } from 'frontend/types'

interface ActionIconsProps {
  'data-tour'?: string
}

export default React.memo(function ActionIcons({
  'data-tour': dataTour
}: ActionIconsProps = {}) {
  const { t } = useTranslation()
  const { refreshLibrary, refreshing } = useContext(ContextProvider)

  const {
    handleLayout,
    layout,
    currentSort,
    setCurrentSort,
    sortInstalled,
    setSortInstalled,
    showAlphabetFilter,
    onToggleAlphabetFilter
  } = useContext(LibraryContext)

  return (
    <div className="ActionIcons" data-tour={dataTour}>
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
              data-tour="library-view-toggle"
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
              data-tour="library-view-toggle"
            />
          </button>
        )}
        {currentSort === SortOptions.random ? (
          <button
            className="FormControl__button"
            title={t('library.sortRandom', 'Sort Randomly')}
            onClick={() => setCurrentSort(SortOptions.alphaAsc)}
          >
            <FontAwesomeIcon
              className="FormControl__segmentedFaIcon"
              icon={faShuffle}
            />
          </button>
        ) : currentSort === SortOptions.alphaDesc ? (
          <button
            className="FormControl__button"
            title={t('library.sortDescending', 'Sort Descending')}
            onClick={() => setCurrentSort(SortOptions.random)}
          >
            <FontAwesomeIcon
              className="FormControl__segmentedFaIcon"
              icon={faArrowDownZA}
            />
          </button>
        ) : (
          <button
            className="FormControl__button"
            title={t('library.sortAscending', 'Sort Ascending')}
            onClick={() => setCurrentSort(SortOptions.alphaDesc)}
          >
            <FontAwesomeIcon
              className="FormControl__segmentedFaIcon"
              icon={faArrowDownAZ}
            />
          </button>
        )}
        <button
          className="FormControl__button"
          title={t('library.sortByStatus', 'Sort by Status')}
          onClick={() => setSortInstalled(!sortInstalled)}
        >
          <FontAwesomeIcon
            className="FormControl__segmentedFaIcon"
            icon={sortInstalled ? hardDriveSolid : hardDriveLight}
            data-tour="library-sort-installed"
          />
        </button>
        <button
          className="FormControl__button"
          title={
            showAlphabetFilter
              ? t('library.hideAlphabetFilter', 'Hide Alphabet Filter')
              : t('library.showAlphabetFilter', 'Show Alphabet Filter')
          }
          onClick={onToggleAlphabetFilter}
        >
          <FontAwesomeIcon
            className="FormControl__segmentedFaIcon"
            icon={showAlphabetFilter ? faFilterCircleXmark : faFilter}
          />
        </button>
        <button
          className={classNames('FormControl__button', {
            active: refreshing
          })}
          title={t('generic.library.refresh', 'Refresh Library')}
          onClick={async () =>
            refreshLibrary({
              checkForUpdates: true
            })
          }
        >
          <FontAwesomeIcon
            className={classNames('FormControl__segmentedFaIcon', {
              ['fa-spin']: refreshing
            })}
            data-tour="library-refresh"
            icon={faSyncAlt}
          />
        </button>
        <TourButton tourId={LIBRARY_TOUR_ID} className="library-tour-button" />
      </FormControl>
    </div>
  )
})
