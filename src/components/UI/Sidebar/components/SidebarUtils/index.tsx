import React from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPatreon, faDiscord } from '@fortawesome/free-brands-svg-icons'
import {
  faCoffee,
  faUser,
  faDoorOpen,
  faUserSlash
} from '@fortawesome/free-solid-svg-icons'
import ElectronStore from 'electron-store'

const { ipcRenderer } = window.require('electron')
const Store = window.require('electron-store')
const configStore: ElectronStore = new Store({
  cwd: 'store'
})
import { handleQuit } from 'src/helpers'
import './index.css'
import { openDiscordLink } from 'src/helpers'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'
import { UserInfo } from 'src/types'

export default function SidebarUtils() {
  const { t } = useTranslation()
  const user = configStore.get('userInfo') as UserInfo
  const { refresh } = React.useContext(ContextProvider)

  const handleLogout = async () => {
    if (confirm(t('userselector.logout_confirmation', 'Logout?'))) {
      await ipcRenderer.invoke('logout')
      window.localStorage.clear()
      refresh()
    }
  }

  const quitButton = (
    <button onClick={handleQuit}>
      <FontAwesomeIcon
        style={{ width: 'clamp(2vh, 25px, 30px)' }}
        icon={faDoorOpen}
      />{' '}
      <span>{t('userselector.quit', 'Quit')}</span>
    </button>
  )

  return (
    <div className="SidebarUtils">
      <button onClick={() => openDiscordLink()}>
        <FontAwesomeIcon
          style={{ width: 'clamp(2vh, 25px, 30px)' }}
          icon={faDiscord}
        />{' '}
        <span>{t('userselector.discord', 'Discord')}</span>
      </button>
      <button onClick={() => ipcRenderer.send('openPatreonPage')}>
        <FontAwesomeIcon
          style={{ width: 'clamp(2vh, 25px, 30px)' }}
          icon={faPatreon}
        />{' '}
        <span>Patreon</span>
      </button>
      <button onClick={() => ipcRenderer.send('openKofiPage')}>
        <FontAwesomeIcon
          style={{ width: 'clamp(2vh, 25px, 30px)' }}
          icon={faCoffee}
        />{' '}
        <span>Ko-fi</span>
      </button>
      {user && (
        <div className="userDropdownWrapper">
          <button>
            <FontAwesomeIcon
              style={{ width: 'clamp(2vh, 25px, 30px)' }}
              icon={faUser}
            />{' '}
            <span>{user.displayName}</span>
          </button>
          <div className="userDropdown">
            <button onClick={handleLogout}>
              <FontAwesomeIcon
                style={{ width: 'clamp(2vh, 25px, 30px)' }}
                icon={faUserSlash}
              />{' '}
              <span>{t('userselector.logout', 'Logout')}</span>
            </button>
            {quitButton}
          </div>
        </div>
      )}
      {!user && quitButton}
    </div>
  )
}
