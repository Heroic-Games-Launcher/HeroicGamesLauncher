import './index.css'

import {
  handleKofi,
  handleQuit,
  openAboutWindow,
  openDiscordLink
} from 'src/helpers'

import { IpcRenderer } from 'electron'
import { useTranslation } from 'react-i18next'
import ArrowDropDown from '@material-ui/icons/ArrowDropDown'
import ContextProvider from 'src/state/ContextProvider'
import React from 'react'

export default function UserSelector() {
  const { t } = useTranslation()
  const { ipcRenderer } = window.require('electron') as {
    ipcRenderer : IpcRenderer
  }

  const { user, refresh, refreshLibrary } = React.useContext(ContextProvider)
  const handleLogout = async () => {
    if (confirm(t('userselector.logout_confirmation', 'Logout?'))) {
      await ipcRenderer.invoke('logout')
      refresh()
    }
  }

  return (
    <div className="UserSelector" data-testid="userselector">
      <span className="userName" data-testid="userName">
        {user}
        <ArrowDropDown className="material-icons" />
      </span>
      <div onClick={() => refreshLibrary()} className="userName hidden" data-testid="refreshLibrary">
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
