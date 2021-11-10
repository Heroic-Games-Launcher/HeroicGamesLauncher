import './index.css'

import {
  handleQuit,
  openAboutWindow
} from 'src/helpers'

import { IpcRenderer } from 'electron'
import { UserInfo } from 'src/types'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'
import ElectronStore from 'electron-store'
import React from 'react'

const Store = window.require('electron-store')
const configStore: ElectronStore = new Store({
  cwd: 'store'
})

export default function UserSelector() {
  const { t } = useTranslation()
  const { refresh, refreshLibrary } = React.useContext(ContextProvider)
  const { ipcRenderer } = window.require('electron') as {
    ipcRenderer : IpcRenderer
  }
  const user = configStore.get('userInfo') as UserInfo
  if (!user){
    return null
  }

  const handleLogout = async () => {
    if (confirm(t('userselector.logout_confirmation', 'Logout?'))) {
      await ipcRenderer.invoke('logout')
      refresh()
    }
  }

  return (
    <div className="UserSelector" data-testid="userSelector">
      <span className="userName" data-testid="userName">
        {user?.displayName}
      </span>
      <div onClick={() => refreshLibrary({checkForUpdates: true, fullRefresh: true, runInBackground: false})} className="userName" data-testid="refreshLibrary">
        {t('userselector.refresh')}
      </div>
      {/* <div onClick={() => handleKofi()} className="userName" data-testid="handleKofi">
        {t('userselector.support')}
      </div> */}

      <div onClick={() => openAboutWindow()} className="userName" data-testid="openAboutWindow">
        {t('userselector.about')}
      </div>
      <div onClick={() => handleLogout()} className="userName" data-testid="handleLogout">
        {t('userselector.logout')}
      </div>
      <div onClick={() => handleQuit()} className="userName" data-testid="handleQuit">
        {t('userselector.quit')}
      </div>
    </div>
  )
}
