import {
  faBorderAll,
  faList,
  faSyncAlt,
  faArrowDownAZ,
  faArrowDownZA,
  faHardDrive as hardDriveSolid
} from '@fortawesome/free-solid-svg-icons'
import { faHardDrive as hardDriveLight } from '@fortawesome/free-regular-svg-icons'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import cx from 'classnames'
import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'
import FormControl from '../FormControl'
import './index.css'

interface Props {
  sortDescending: boolean
  sortInstalled: boolean
  toggleSortDescending: () => void
  toggleSortinstalled: () => void
}

export default function ActionIcons({
  sortDescending,
  toggleSortDescending,
  sortInstalled,
  toggleSortinstalled
}: Props) {
  const { t } = useTranslation()
  const { refreshLibrary, handleLayout, layout } = useContext(ContextProvider)
  return (
    <div className="ActionIcons">
      <FormControl segmented small>
        <button
          className={cx('FormControl__button', { active: layout === 'grid' })}
          title={t('library.gridView')}
          onClick={() => handleLayout('grid')}
        >
          <FontAwesomeIcon
            className="FormControl__segmentedFaIcon"
            icon={faBorderAll}
          />
        </button>
        <button
          className={cx('FormControl__button', { active: layout === 'list' })}
          title={t('library.listView')}
          onClick={() => handleLayout('list')}
        >
          <FontAwesomeIcon
            className="FormControl__segmentedFaIcon"
            icon={faList}
          />
        </button>
        <button
          className={cx('FormControl__button', 'active')}
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
          className={cx('FormControl__button', 'active')}
          title={t('library.sortByStatus', 'Sort by S          onClick={async () =>tatus')}
          onClick={() => toggleSortinstalled()}
        >
          <FontAwesomeIcon
            className="FormControl__segmentedFaIcon"
            icon={sortInstalled ? hardDriveSolid : hardDriveLight}
          />
        </button>
        <button
          className="FormControl__button"
          title={t('library.refresh', 'Refresh Library')}
          onClick={async () =>
            refreshLibrary({
              checkForUpdates: true,
              fullRefresh: true,
              runInBackground: false
            })
          }
        >
          <FontAwesomeIcon
            className="FormControl__segmentedFaIcon"
            icon={faSyncAlt}
          />
        </button>
      </FormControl>
    </div>
  )
}
