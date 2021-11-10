import React, { useContext } from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBorderAll, faList } from '@fortawesome/free-solid-svg-icons'

import ContextProvider from 'src/state/ContextProvider'

import './index.css'

export default function LayoutSelection() {
  const {
    layout,
    handleLayout } = useContext(ContextProvider)
  return (
    <div className="layoutSelection">
      <FontAwesomeIcon
        icon={faBorderAll}
        data-testid="grid"
        className={
          layout === 'grid'
            ? 'selectedLayout material-icons'
            : 'material-icons'
        }
        onClick={() => handleLayout('grid')}
      />
      <FontAwesomeIcon
        icon={faList}
        data-testid="list"
        className={
          layout === 'list'
            ? 'selectedLayout material-icons'
            : 'material-icons'
        }
        onClick={() => handleLayout('list')}
      />
    </div>
  )
}
