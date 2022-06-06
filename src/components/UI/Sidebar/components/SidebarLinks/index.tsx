import {
  faBookOpen,
  faGamepad,
  faSlidersH,
  faStore,
  faUser,
  faUniversalAccess
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { openDiscordLink } from 'src/helpers'
import classNames from 'classnames'
import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { faDiscord, faPatreon } from '@fortawesome/free-brands-svg-icons'
import {
  faCoffee,
  faUserAlt,
  faWineGlass
} from '@fortawesome/free-solid-svg-icons'
const { ipcRenderer } = window.require('electron')

import ContextProvider from 'src/state/ContextProvider'
import { Runner } from 'src/types'
import './index.css'
import QuitButton from '../QuitButton'

interface LocationState {
  fromGameCard: boolean
  hasCloudSave: boolean
  runner: Runner
  isLinuxNative: boolean
  isMacNative: boolean
}

export default function SidebarLinks() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { state } = useLocation() as { state: LocationState }
  const location = useLocation() as { pathname: string }
  const [appName, type] = location.pathname
    .replaceAll('/settings/', '')
    .split('/')

  const { epic, gog, platform } = useContext(ContextProvider)

  const isStore = location.pathname.includes('store')
  const isSettings = location.pathname.includes('settings')
  const isDefaultSetting = location.pathname.startsWith('/settings/default')

  const {
    hasCloudSave = false,
    isLinuxNative = false,
    isMacNative = false
  } = state || {}
  const isWin = platform === 'win32'
  const isLinuxGame = isLinuxNative && platform === 'linux'
  const isMacGame = isMacNative && platform === 'darwin'
  const isLinux = platform === 'linux'

  const shouldRenderWineSettings = !isWin && !isMacGame && !isLinuxGame

  const loggedIn = epic.username || gog.username

  return (
    <div className="SidebarLinks Sidebar__section">
      {loggedIn && (
        <NavLink
          className={({ isActive }) =>
            classNames('Sidebar__item', { active: isActive })
          }
          to={'/'}
        >
          <>
            <div className="Sidebar__itemIcon">
              <FontAwesomeIcon icon={faGamepad} />
            </div>
            {t('Library')}
          </>
        </NavLink>
      )}
      {!loggedIn && (
        <NavLink
          className={({ isActive }) =>
            classNames('Sidebar__item', { active: isActive })
          }
          to={'/login'}
        >
          <>
            <div className="Sidebar__itemIcon">
              <FontAwesomeIcon icon={faUser} />
            </div>
            {t('button.login', 'Login')}
          </>
        </NavLink>
      )}
      <NavLink
        className={({ isActive }) =>
          classNames('Sidebar__item', { active: isActive })
        }
        to="/epicstore"
      >
        <>
          <div className="Sidebar__itemIcon">
            <FontAwesomeIcon icon={faStore} />
          </div>
          {t('stores', 'Stores')}
        </>
      </NavLink>
      {isStore && (
        <>
          <NavLink
            data-testid="store"
            className={({ isActive }) =>
              classNames('Sidebar__item', 'SidebarLinks__subItem', {
                active: isActive
              })
            }
            to="/epicstore"
          >
            {t('store', 'Epic Store')}
          </NavLink>
          <NavLink
            data-testid="store"
            className={({ isActive }) =>
              classNames('Sidebar__item', 'SidebarLinks__subItem', {
                active: isActive
              })
            }
            to="/gogstore"
          >
            {t('gog-store', 'GOG Store')}
          </NavLink>
        </>
      )}
      <NavLink
        data-testid="settings"
        className={({ isActive }) =>
          classNames('Sidebar__item', { active: isActive })
        }
        to={{ pathname: '/settings/default/general' }}
        state={{ fromGameCard: false }}
      >
        <>
          <div className="Sidebar__itemIcon">
            <FontAwesomeIcon icon={faSlidersH} />
          </div>
          {t('Settings')}
        </>
      </NavLink>
      {isSettings && (
        <>
          {isDefaultSetting && (
            <NavLink
              role="link"
              to={{ pathname: '/settings/default/general' }}
              state={{ fromGameCard: false }}
              className={classNames('Sidebar__item SidebarLinks__subItem', {
                ['active']: type === 'general'
              })}
            >
              {t('settings.navbar.general')}
            </NavLink>
          )}
          {shouldRenderWineSettings && (
            <NavLink
              role="link"
              to={`/settings/${appName}/wine`}
              state={{ ...state, runner: state?.runner }}
              className={classNames('Sidebar__item SidebarLinks__subItem', {
                ['active']: type === 'wine'
              })}
            >
              Wine
            </NavLink>
          )}
          {hasCloudSave && (
            <NavLink
              role="link"
              data-testid="linkSync"
              to={`/settings/${appName}/sync`}
              state={{ ...state, runner: state?.runner }}
              className={classNames('Sidebar__item SidebarLinks__subItem', {
                ['active']: type === 'sync'
              })}
            >
              {t('settings.navbar.sync')}
            </NavLink>
          )}
          <NavLink
            role="link"
            to={`/settings/${appName}/other`}
            state={{ ...state, runner: state?.runner }}
            className={classNames('Sidebar__item SidebarLinks__subItem', {
              ['active']: type === 'other'
            })}
          >
            {t('settings.navbar.other')}
          </NavLink>
          {isDefaultSetting && (
            <NavLink
              role="link"
              to={`/settings/${appName}/advanced`}
              state={{ ...state, runner: state?.runner }}
              className={classNames('Sidebar__item SidebarLinks__subItem', {
                ['active']: type === 'advanced'
              })}
            >
              {t('settings.navbar.advanced', 'Advanced')}
            </NavLink>
          )}
          <NavLink
            role="link"
            to={`/settings/${appName}/log`}
            state={{ ...state, runner: state?.runner }}
            className={classNames('Sidebar__item SidebarLinks__subItem', {
              ['active']: type === 'log'
            })}
          >
            {t('settings.navbar.log', 'Log')}
          </NavLink>
        </>
      )}
      <NavLink
        data-testid="wiki"
        className={({ isActive }) =>
          classNames('Sidebar__item', { active: isActive })
        }
        to={{ pathname: '/wiki' }}
      >
        <>
          <div className="Sidebar__itemIcon">
            <FontAwesomeIcon icon={faBookOpen} />
          </div>
          {t('wiki', 'Wiki')}
        </>
      </NavLink>
      <div className="divider" />
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
      <div className="divider" />
      <NavLink
        data-testid="accessibility"
        className={({ isActive }) =>
          classNames('Sidebar__item', { active: isActive })
        }
        to={{ pathname: '/accessibility' }}
      >
        <>
          <div className="Sidebar__itemIcon">
            <FontAwesomeIcon icon={faUniversalAccess} />
          </div>
          {t('accessibility.title', 'Accessibility')}
        </>
      </NavLink>
      {isLinux && (
        <NavLink
          className={({ isActive }) =>
            classNames('Sidebar__item', { active: isActive })
          }
          to={{ pathname: '/wine-manager' }}
        >
          <>
            <div className="Sidebar__itemIcon">
              <FontAwesomeIcon icon={faWineGlass} />
            </div>
            {t('wine.manager.link', 'Wine Manager')}
          </>
        </NavLink>
      )}
      <button className="Sidebar__item" onClick={() => navigate('/login')}>
        <div className="Sidebar__itemIcon">
          <FontAwesomeIcon icon={faUserAlt} />
        </div>
        {t('userselector.manageaccounts', 'Manage Accounts')}
      </button>
      <QuitButton />
    </div>
  )
}
