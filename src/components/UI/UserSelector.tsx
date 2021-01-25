import React from 'react'
import {
  legendary,
  openAboutWindow,
  handleQuit,
  handleKofi,
} from '../../helper'
import ContextProvider from '../../state/ContextProvider'

export default function UserSelector() {
  const { user, refresh, refreshLibrary } = React.useContext(ContextProvider)
  const handleLogout = async () => {
    // eslint-disable-next-line no-restricted-globals
    if (confirm('are you sure?')) {
      await legendary(`auth --delete`)
      await legendary(`cleanup`)
      refresh()
    }
  }

  return (
    <div className="UserSelector">
      <span className="userName">
        {user}
        <span className="material-icons">arrow_drop_down</span>
      </span>
      <div onClick={() => refreshLibrary()} className="userName hidden">
        Refresh Library
      </div>
      <div onClick={() => handleKofi()} className="userName hidden">
        Buy a Ko-fi
      </div>
      <div onClick={() => openAboutWindow()} className="userName hidden">
        About
      </div>
      <div onClick={() => handleLogout()} className="userName hidden">
        Logout
      </div>
      <div onClick={() => handleQuit()} className="userName hidden">
        Quit
      </div>
    </div>
  )
}
