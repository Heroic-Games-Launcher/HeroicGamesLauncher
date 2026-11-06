import React from 'react'
import ActionIcons from 'frontend/components/UI/ActionIcons'
import Header from 'frontend/components/UI/Header'
import './index.css'
import AddGameButton from '../AddGameButton'

export default React.memo(function LibraryHeader() {
  return (
    <div className="libraryHeader" data-tour="library-header">
      <div className="libraryHeaderWrapper">
        <AddGameButton data-tour="library-add-game" />
      </div>
      <div className="libraryToolbar">
        <Header />
        <ActionIcons />
      </div>
    </div>
  )
})
