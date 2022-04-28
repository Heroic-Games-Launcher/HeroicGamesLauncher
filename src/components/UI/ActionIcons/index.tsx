import {
  faBorderAll,
  faList,
  faSyncAlt,
  faArrowDownAZ,
  faArrowDownZA
} from '@fortawesome/free-solid-svg-icons'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import cx from 'classnames'
import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'
import FormControl from '../FormControl'
import './index.css'

interface Props {
  sortAscending: boolean
  handleClick: () => void
}

export default function ActionIcons({ sortAscending, handleClick }: Props) {
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
          title={t('library.listView')}
          onClick={() => handleClick()}
        >
          <FontAwesomeIcon
            className="FormControl__segmentedFaIcon"
            icon={sortAscending ? faArrowDownAZ : faArrowDownZA}
          />
        </button>
        <button
          className="FormControl__button"
          title={t('library.refresh')}
          onClick={() =>
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
