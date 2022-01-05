import React, { useContext } from 'react'
import './index.css'

import {
  faSyncAlt,
  faBorderAll,
  faList
} from '@fortawesome/free-solid-svg-icons'
import cx from 'classnames'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { SvgButton } from '..'
import ContextProvider from 'src/state/ContextProvider'

export default function index() {
  const { refreshLibrary, handleLayout, layout } = useContext(ContextProvider)
  return (
    <div className="headerIcons">
      <SvgButton onClick={() => handleLayout('grid')}>
        <FontAwesomeIcon
          className={cx({ selectedLayout: layout === 'grid' })}
          icon={faBorderAll}
        />
      </SvgButton>
      <SvgButton onClick={() => handleLayout('list')}>
        <FontAwesomeIcon
          className={cx({ selectedLayout: layout === 'list' })}
          icon={faList}
        />
      </SvgButton>
      <SvgButton
        onClick={() =>
          refreshLibrary({
            checkForUpdates: true,
            fullRefresh: true,
            runInBackground: false
          })
        }
      >
        <FontAwesomeIcon className="refreshIcon" icon={faSyncAlt} />
      </SvgButton>
    </div>
  )
}
