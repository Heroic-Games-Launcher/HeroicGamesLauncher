import React from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPatreon, faDiscord } from '@fortawesome/free-brands-svg-icons'
import {
  faCoffee,
  faUser,
  faDoorOpen,
  faUserAlt,
  faWineGlass
} from '@fortawesome/free-solid-svg-icons'
import ElectronStore from 'electron-store'

const { ipcRenderer } = window.require('electron')
const Store = window.require('electron-store')
const configStore: ElectronStore = new Store({
  cwd: 'store'
})
const gogStore = new Store({
  cwd: 'gog_store'
})
import { handleQuit } from 'src/helpers'
import './index.css'
import { openDiscordLink } from 'src/helpers'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'
import { NavLink, useHistory } from 'react-router-dom'

export default function SidebarUtils() {
  const { t } = useTranslation()
  const history = useHistory()
  const user = configStore.get('userInfo') || gogStore.get('userData')
  const { platform } = React.useContext(ContextProvider)
  const isLinux = platform === 'linux'

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
      {isLinux && (
        <NavLink
          activeStyle={{ color: 'var(--accent)', fontWeight: 500 }}
          isActive={(match, location) =>
            location.pathname.includes('wine-manager')
          }
          to={{
            pathname: '/wine-manager'
          }}
        >
          <FontAwesomeIcon
            style={{ width: 'clamp(2vh, 25px, 30px)' }}
            icon={faWineGlass}
          />{' '}
          {t('wine.manager.link', 'Wine Manager')}
        </NavLink>
      )}
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
            <span>{user.displayName || user.username}</span>
          </button>
          <div className="userDropdown">
            <button onClick={() => history.push('/login')}>
              <FontAwesomeIcon
                icon={faUserAlt}
                style={{ width: 'clamp(2vh, 25px, 30px)' }}
              />
              <span>{t('userselector.manageaccounts', 'Manage Accounts')}</span>
            </button>
            {quitButton}
          </div>
        </div>
      )}
      {!user && quitButton}
    </div>
  )
}
