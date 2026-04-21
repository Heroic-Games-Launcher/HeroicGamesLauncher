import {
  ArrowDownAZ,
  ArrowDownZA,
  HardDrive,
  LayoutGrid,
  List,
  ListFilter,
  FilterX,
  RefreshCw
} from 'lucide-react'

import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import FormControl from '../FormControl'
import './index.css'
import classNames from 'classnames'
import LibraryContext from 'frontend/screens/Library/LibraryContext'
import TourButton from 'frontend/components/Tour/TourButton'
import { LIBRARY_TOUR_ID } from 'frontend/screens/Library/components/LibraryTour'

interface ActionIconsProps {
  'data-tour'?: string
}

const ICON_SIZE = 20
const STROKE = 1.75

export default React.memo(function ActionIcons({
  'data-tour': dataTour
}: ActionIconsProps = {}) {
  const { t } = useTranslation()
  const { refreshLibrary, refreshing } = useContext(ContextProvider)

  const {
    handleLayout,
    layout,
    sortDescending,
    setSortDescending,
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
            <List
              className="FormControl__segmentedLucideIcon"
              size={ICON_SIZE}
              strokeWidth={STROKE}
              data-tour="library-view-toggle"
              aria-hidden
            />
          </button>
        ) : (
          <button
            className="FormControl__button"
            title={t('library.toggleLayout.grid', 'Toggle to a grid layout')}
            onClick={() => handleLayout('grid')}
          >
            <LayoutGrid
              className="FormControl__segmentedLucideIcon"
              size={ICON_SIZE}
              strokeWidth={STROKE}
              data-tour="library-view-toggle"
              aria-hidden
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
          {sortDescending ? (
            <ArrowDownZA
              className="FormControl__segmentedLucideIcon"
              size={ICON_SIZE}
              strokeWidth={STROKE}
              data-tour="library-sort-az"
              aria-hidden
            />
          ) : (
            <ArrowDownAZ
              className="FormControl__segmentedLucideIcon"
              size={ICON_SIZE}
              strokeWidth={STROKE}
              data-tour="library-sort-az"
              aria-hidden
            />
          )}
        </button>
        <button
          className="FormControl__button"
          title={t('library.sortByStatus', 'Sort by Status')}
          onClick={() => setSortInstalled(!sortInstalled)}
        >
          <HardDrive
            className="FormControl__segmentedLucideIcon"
            size={ICON_SIZE}
            strokeWidth={sortInstalled ? 2.25 : STROKE}
            fill={sortInstalled ? 'currentColor' : 'none'}
            fillOpacity={sortInstalled ? 0.15 : 0}
            data-tour="library-sort-installed"
            aria-hidden
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
          {showAlphabetFilter ? (
            <FilterX
              className="FormControl__segmentedLucideIcon"
              size={ICON_SIZE}
              strokeWidth={STROKE}
              aria-hidden
            />
          ) : (
            <ListFilter
              className="FormControl__segmentedLucideIcon"
              size={ICON_SIZE}
              strokeWidth={STROKE}
              aria-hidden
            />
          )}
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
          <RefreshCw
            className={classNames('FormControl__segmentedLucideIcon', {
              ['lucide-spin']: refreshing
            })}
            size={ICON_SIZE}
            strokeWidth={STROKE}
            data-tour="library-refresh"
            aria-hidden
          />
        </button>
        <TourButton tourId={LIBRARY_TOUR_ID} className="library-tour-button" />
      </FormControl>
    </div>
  )
})
