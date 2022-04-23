import { faDiscord, faPatreon } from '@fortawesome/free-brands-svg-icons'
import {
  faCoffee,
  faUser,
  faUserAlt,
  faWineGlass
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useHistory } from 'react-router-dom'
import { openDiscordLink } from 'src/helpers'
import { configStore, gogConfigStore } from 'src/helpers/electron_stores'
import ContextProvider from 'src/state/ContextProvider'
import QuitButton from '../QuitButton'
import './index.css'

const { ipcRenderer } = window.require('electron')

export default function SidebarUtils() {
  const { t } = useTranslation()
  const history = useHistory()
  const { platform } = React.useContext(ContextProvider)
  const user = configStore.get('userInfo') || gogConfigStore.get('userData')
  const isLinux = platform === 'linux'

  return (
    <div className="SidebarUtils Sidebar__section">
      {isLinux && (
        <NavLink
          className="Sidebar__item"
          isActive={(match, location) =>
            location.pathname.includes('wine-manager')
          }
          to={{ pathname: '/wine-manager' }}
        >
          <div className="Sidebar__itemIcon">
            <FontAwesomeIcon icon={faWineGlass} />
          </div>
          {t('wine.manager.link', 'Wine Manager')}
        </NavLink>
      )}
      <button className="Sidebar__item" onClick={() => openDiscordLink()}>
        <div className="Sidebar__itemIcon">
          <FontAwesomeIcon icon={faDiscord} />
        </div>
        {t('userselector.discord', 'Discord')}
      </button>
      <button
        className="Sidebar__item"
        onClick={() => ipcRenderer.send('openPatreonPage')}
      >
        <div className="Sidebar__itemIcon">
          <FontAwesomeIcon icon={faPatreon} />
        </div>
        <span>Patreon</span>
      </button>
      <button
        className="Sidebar__item"
        onClick={() => ipcRenderer.send('openKofiPage')}
      >
        <div className="Sidebar__itemIcon">
          <FontAwesomeIcon icon={faCoffee} />
        </div>
        Ko-fi
      </button>
      {user ? (
        <div className="SidebarUtils__dropdown">
          <button className="Sidebar__item">
            <div className="Sidebar__itemIcon">
              <FontAwesomeIcon icon={faUser} />
            </div>
            {user.displayName || user.username}
          </button>
          <div className="SidebarUtils__dropdownPopup ">
            <button
              className="Sidebar__item"
              onClick={() => history.push('/login')}
            >
              <div className="Sidebar__itemIcon">
                <FontAwesomeIcon icon={faUserAlt} />
              </div>
              {t('userselector.manageaccounts', 'Manage Accounts')}
            </button>
            <QuitButton />
          </div>
        </div>
      ) : (
        <QuitButton />
      )}
    </div>
  )
}
