import React, { useContext } from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBorderAll, faList } from '@fortawesome/free-solid-svg-icons'
import cx from 'classnames'

import ContextProvider from 'src/state/ContextProvider'

import './index.css'
import { useTranslation } from 'react-i18next'

export default function LayoutSelection() {
  const {
    layout,
    handleLayout } = useContext(ContextProvider)
  const { t } = useTranslation()

  return (
    <div className="layoutSelection">
      <p>{t('layout.title', 'Layout Selection')}</p>
      <div className="layoutIcons">
        <button
          onClick={() => handleLayout('grid')}
          className={cx({selectedLayout: layout === 'grid'})}
        >
          <FontAwesomeIcon
            icon={faBorderAll}
            data-testid="grid"
          />
          <span>{t('layout.grid', 'Grid')}</span>
        </button>
        <button
          onClick={() => handleLayout('list')}
          className={cx({selectedLayout: layout === 'list'})}
        >
          <FontAwesomeIcon
            icon={faList}
            data-testid="list"
            onClick={() => handleLayout('list')}
          />
          <span>{t('layout.list', 'List')}</span>
        </button>
      </div>
    </div>
  )
}
