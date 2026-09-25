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

import React, { useContext, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import FormControl from '../FormControl'
import Icon from '../Icon'
import './index.css'
import classNames from 'classnames'
import LibraryContext from 'frontend/screens/Library/LibraryContext'
import TourButton from 'frontend/components/Tour/TourButton'
import { LIBRARY_TOUR_ID } from 'frontend/screens/Library/components/LibraryTour'

interface ActionIconsProps {
  'data-tour'?: string
}

export default React.memo(function ActionIcons({
  'data-tour': dataTour
}: ActionIconsProps = {}) {
  const { t } = useTranslation()
  const { refreshLibrary, refreshing } = useContext(ContextProvider)
  const [spinning, setSpinning] = useState(false)
  const spinTimeout = useRef<ReturnType<typeof setTimeout>>()

  useEffect(
    () => () => {
      if (spinTimeout.current) clearTimeout(spinTimeout.current)
    },
    []
  )

  const handleRefresh = async () => {
    if (spinTimeout.current) clearTimeout(spinTimeout.current)
    setSpinning(true)
    const startedAt = Date.now()
    await refreshLibrary({ checkForUpdates: true })
    spinTimeout.current = setTimeout(
      () => setSpinning(false),
      Math.max(0, 700 - (Date.now() - startedAt))
    )
  }

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
            <Icon
              glyph={List}
              className="FormControl__segmentedLucideIcon"
              data-tour="library-view-toggle"
            />
          </button>
        ) : (
          <button
            className="FormControl__button"
            title={t('library.toggleLayout.grid', 'Toggle to a grid layout')}
            onClick={() => handleLayout('grid')}
          >
            <Icon
              glyph={LayoutGrid}
              className="FormControl__segmentedLucideIcon"
              data-tour="library-view-toggle"
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
            <Icon
              glyph={ArrowDownZA}
              className="FormControl__segmentedLucideIcon"
              data-tour="library-sort-az"
            />
          ) : (
            <Icon
              glyph={ArrowDownAZ}
              className="FormControl__segmentedLucideIcon"
              data-tour="library-sort-az"
            />
          )}
        </button>
        <button
          className="FormControl__button"
          title={t('library.sortByStatus', 'Sort by Status')}
          onClick={() => setSortInstalled(!sortInstalled)}
        >
          <Icon
            glyph={HardDrive}
            className="FormControl__segmentedLucideIcon"
            strokeWidth={sortInstalled ? 2.25 : undefined}
            fill={sortInstalled ? 'currentColor' : 'none'}
            fillOpacity={sortInstalled ? 0.15 : 0}
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
          {showAlphabetFilter ? (
            <Icon
              glyph={FilterX}
              className="FormControl__segmentedLucideIcon"
            />
          ) : (
            <Icon
              glyph={ListFilter}
              className="FormControl__segmentedLucideIcon"
            />
          )}
        </button>
        <button
          className={classNames('FormControl__button', {
            active: refreshing || spinning
          })}
          title={t('generic.library.refresh', 'Refresh Library')}
          onClick={handleRefresh}
        >
          <Icon
            glyph={RefreshCw}
            className={classNames('FormControl__segmentedLucideIcon', {
              ['lucide-spin']: refreshing || spinning
            })}
            data-tour="library-refresh"
          />
        </button>
        <TourButton tourId={LIBRARY_TOUR_ID} className="library-tour-button" />
      </FormControl>
    </div>
  )
})
