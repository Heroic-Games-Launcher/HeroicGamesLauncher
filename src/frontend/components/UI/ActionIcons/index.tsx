import {
  faBorderAll,
  faList,
  faSyncAlt,
  faArrowDownAZ,
  faArrowDownZA,
  faHardDrive as hardDriveSolid,
  faFilter,
  faFilterCircleXmark,
  faFileExport
} from '@fortawesome/free-solid-svg-icons'
import { faHardDrive as hardDriveLight } from '@fortawesome/free-regular-svg-icons'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import { notify } from 'frontend/helpers'
import FormControl from '../FormControl'
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
  const {
    refreshLibrary,
    refreshing,
    epic,
    gog,
    amazon,
    zoom,
    sideloadedLibrary
  } = useContext(ContextProvider)

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

  const handleExport = async () => {
    try {
      const filePath = await window.api.saveDialog({
        title: t(
          'setting.experimental_features.exportLibrary.selectFolder',
          'Select location to save library export'
        ),
        defaultPath: `heroic_library_${new Date()
          .toISOString()
          .replace(/[:.]/g, '-')
          .slice(0, 19)}.csv`,
        filters: [{ name: 'CSV', extensions: ['csv'] }]
      })

      if (!filePath) {
        return
      }

      // Collect all games from frontend state
      const allGames = [
        ...epic.library,
        ...gog.library,
        ...amazon.library,
        ...zoom.library,
        ...sideloadedLibrary
      ]

      const result = await window.api.exportLibrary({
        filePath,
        games: allGames
      })

      if (result.success) {
        notify({
          title: 'Export',
          body: `Library exported to: ${result.filePath}`
        })
      } else {
        notify({
          title: 'Export',
          body: `Export failed: ${result.error}`
        })
      }
    } catch (err: any) {
      notify({
        title: 'Export',
        body: err.message || 'An error occurred during export'
      })
    }
  }

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
            data-tour="library-sort-az"
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
        <button
          className="FormControl__button"
          title={t('library.export', 'Export Library')}
          onClick={handleExport}
        >
          <FontAwesomeIcon
            className="FormControl__segmentedFaIcon"
            icon={faFileExport}
            data-tour="library-export"
          />
        </button>
        <TourButton tourId={LIBRARY_TOUR_ID} className="library-tour-button" />
      </FormControl>
    </div>
  )
})
