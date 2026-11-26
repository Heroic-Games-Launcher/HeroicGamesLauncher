import React from 'react'
import ActionIcons from 'frontend/components/UI/ActionIcons'
import Header from 'frontend/components/UI/Header'
import ConsoleModeButton from '../ConsoleModeButton'
import AddGameButton from '../AddGameButton'
import './index.css'

export default React.memo(function LibraryHeader() {
  return (
    <div className="libraryHeader" data-tour="library-header">
      <div className="libraryToolbar">
        <Header />
        <ActionIcons data-tour="library-actions" />
        <div
          className="libraryToolbar__actions"
          data-tour="library-section-actions"
        >
          <ConsoleModeButton data-tour="library-console-mode" />
          <AddGameButton data-tour="library-add-game" />
        </div>
      </div>
    </div>
  )
})
