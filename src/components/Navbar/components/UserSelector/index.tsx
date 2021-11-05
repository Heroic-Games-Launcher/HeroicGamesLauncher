import './index.css'

import {
  handleKofi,
  handleQuit,
  openAboutWindow,
  openDiscordLink
} from 'src/helpers'

import { IpcRenderer } from 'electron'
import { UserInfo } from 'src/types'
import { useTranslation } from 'react-i18next'
import ArrowDropDown from '@material-ui/icons/ArrowDropDown'
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
        <ArrowDropDown className="material-icons" />
      </span>
      <div onClick={() => refreshLibrary({checkForUpdates: true, fullRefresh: true, runInBackground: false})} className="userName hidden" data-testid="refreshLibrary">
        {t('userselector.refresh')}
      </div>
      <div onClick={() => handleKofi()} className="userName hidden" data-testid="handleKofi">
        {t('userselector.support')}
      </div>
      <div onClick={() => openDiscordLink()} className="userName hidden" data-testid="openDiscordLink">
        {t('userselector.discord', 'Discord')}
      </div>
      <div onClick={() => openAboutWindow()} className="userName hidden" data-testid="openAboutWindow">
        {t('userselector.about')}
      </div>
      <div onClick={() => handleLogout()} className="userName hidden" data-testid="handleLogout">
        {t('userselector.logout')}
      </div>
      <div onClick={() => handleQuit()} className="userName hidden" data-testid="handleQuit">
        {t('userselector.quit')}
      </div>
    </div>
  )
}
