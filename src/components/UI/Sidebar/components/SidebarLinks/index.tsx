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
import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { faDiscord, faPatreon } from '@fortawesome/free-brands-svg-icons'
import {
  faCoffee,
  faUserAlt,
  faWineGlass
} from '@fortawesome/free-solid-svg-icons'
import { ipcRenderer } from 'src/helpers'

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
  const [isDefaultSetting, setIsDefaultSetting] = useState(
    location.pathname.startsWith('/settings/default')
  )
  const [settingsPath, setSettingsPath] = useState('/settings/default/general')
  const [isFullscreen, setIsFullscreen] = useState(false)

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

  useEffect(() => {
    let tmpAppName = ''
    if (location.pathname.startsWith('/gamepage/')) {
      tmpAppName = location.pathname.replace('/gamepage/', '')
    } else {
      tmpAppName = appName !== 'default' ? appName : ''
    }

    if (
      !(
        gog.library.some(
          (game) => game.app_name === tmpAppName && game.is_installed
        ) ||
        epic.library.some(
          (game) => game.app_name === tmpAppName && game.is_installed
        )
      )
    ) {
      tmpAppName = ''
    }
    
    if (tmpAppName) {
      setSettingsPath(`/settings/${tmpAppName}/wine`)
      setIsDefaultSetting(false)
    } else {
      setSettingsPath('/settings/default/general')
      setIsDefaultSetting(true)
    }
  }, [location])

  useEffect(() => {
    ipcRenderer.invoke('isFullscreen').then((res) => setIsFullscreen(res))
  }, [])

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
              <FontAwesomeIcon icon={faGamepad} title={t('Library')} />
            </div>
            <span>{t('Library')}</span>
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
              <FontAwesomeIcon
                icon={faUser}
                title={t('button.login', 'Login')}
              />
            </div>
            <span>{t('button.login', 'Login')}</span>
          </>
        </NavLink>
      )}
      <div className="SidebarItemWithSubmenu">
        <NavLink
          className={({ isActive }) =>
            classNames('Sidebar__item', { active: isActive })
          }
          to="/epicstore"
        >
          <>
            <div className="Sidebar__itemIcon">
              <FontAwesomeIcon icon={faStore} title={t('stores', 'Stores')} />
            </div>
            <span>{t('stores', 'Stores')}</span>
          </>
        </NavLink>
        {isStore && (
          <div className="SidebarSubmenu">
            <NavLink
              data-testid="store"
              className={({ isActive }) =>
                classNames('Sidebar__item', 'SidebarLinks__subItem', {
                  active: isActive
                })
              }
              to="/epicstore"
            >
              <span>{t('store', 'Epic Store')}</span>
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
              <span>{t('gog-store', 'GOG Store')}</span>
            </NavLink>
          </div>
        )}
      </div>
      <div className="divider" />
      <div className="SidebarItemWithSubmenu">
        <NavLink
          data-testid="settings"
          className={({ isActive }) =>
            classNames('Sidebar__item', { active: isActive })
          }
          to={{ pathname: settingsPath }}
          state={{ fromGameCard: false }}
        >
          <>
            <div className="Sidebar__itemIcon">
              <FontAwesomeIcon
                icon={faSlidersH}
                title={
                  isDefaultSetting
                    ? t('Settings')
                    : t('GameSettings', 'Game Settings')
                }
              />
            </div>
            <span>
              {isDefaultSetting
                ? t('Settings')
                : t('GameSettings', 'Game Settings')}
            </span>
          </>
        </NavLink>
        {isSettings && (
          <div className="SidebarSubmenu settings">
            {isDefaultSetting && (
              <NavLink
                role="link"
                to={{ pathname: '/settings/default/general' }}
                state={{ fromGameCard: false }}
                className={classNames('Sidebar__item SidebarLinks__subItem', {
                  ['active']: type === 'general'
                })}
              >
                <span>{t('settings.navbar.general')}</span>
              </NavLink>
            )}
            {shouldRenderWineSettings && (
              <>
                <NavLink
                  role="link"
                  to={`/settings/${appName}/wine`}
                  state={{ ...state, runner: state?.runner }}
                  className={classNames('Sidebar__item SidebarLinks__subItem', {
                    ['active']: type === 'wine'
                  })}
                >
                  <span>Wine</span>
                </NavLink>
                <NavLink
                  role="link"
                  to={`/settings/${appName}/wineExt`}
                  state={{ ...state, runner: state?.runner }}
                  className={classNames('Sidebar__item SidebarLinks__subItem', {
                    ['active']: type === 'wineExt'
                  })}
                >
                  <span>{t('settings.navbar.wineExt', 'Wine Extensions')}</span>
                </NavLink>
              </>
            )}
            {hasCloudSave && !isLinuxGame && (
              <NavLink
                role="link"
                data-testid="linkSync"
                to={`/settings/${appName}/sync`}
                state={{ ...state, runner: state?.runner }}
                className={classNames('Sidebar__item SidebarLinks__subItem', {
                  ['active']: type === 'sync'
                })}
              >
                <span>{t('settings.navbar.sync')}</span>
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
              <span>{t('settings.navbar.other')}</span>
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
                <span>{t('settings.navbar.advanced', 'Advanced')}</span>
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
              <span>{t('settings.navbar.log', 'Log')}</span>
            </NavLink>
          </div>
        )}
      </div>
      {isLinux && (
        <NavLink
          className={({ isActive }) =>
            classNames('Sidebar__item', { active: isActive })
          }
          to={{ pathname: '/wine-manager' }}
        >
          <>
            <div className="Sidebar__itemIcon">
              <FontAwesomeIcon
                icon={faWineGlass}
                title={t('wine.manager.link', 'Wine Manager')}
              />
            </div>
            <span>{t('wine.manager.link', 'Wine Manager')}</span>
          </>
        </NavLink>
      )}
      <button className="Sidebar__item" onClick={() => navigate('/login')}>
        <div className="Sidebar__itemIcon">
          <FontAwesomeIcon
            icon={faUserAlt}
            title={t('userselector.manageaccounts', 'Manage Accounts')}
          />
        </div>
        <span>{t('userselector.manageaccounts', 'Manage Accounts')}</span>
      </button>
      <NavLink
        data-testid="accessibility"
        className={({ isActive }) =>
          classNames('Sidebar__item', { active: isActive })
        }
        to={{ pathname: '/accessibility' }}
      >
        <>
          <div className="Sidebar__itemIcon">
            <FontAwesomeIcon
              icon={faUniversalAccess}
              title={t('accessibility.title', 'Accessibility')}
            />
          </div>
          <span>{t('accessibility.title', 'Accessibility')}</span>
        </>
      </NavLink>
      <div className="divider" />
      <NavLink
        data-testid="wiki"
        className={({ isActive }) =>
          classNames('Sidebar__item', { active: isActive })
        }
        to={{ pathname: '/wiki' }}
      >
        <>
          <div className="Sidebar__itemIcon">
            <FontAwesomeIcon
              icon={faBookOpen}
              title={t('docs', 'Documentation')}
            />
          </div>
          <span>{t('docs', 'Documentation')}</span>
        </>
      </NavLink>
      <button className="Sidebar__item" onClick={() => openDiscordLink()}>
        <div className="Sidebar__itemIcon">
          <FontAwesomeIcon
            icon={faDiscord}
            title={t('userselector.discord', 'Discord')}
          />
        </div>
        <span>{t('userselector.discord', 'Discord')}</span>
      </button>
      <button
        className="Sidebar__item"
        onClick={() => ipcRenderer.send('openPatreonPage')}
      >
        <div className="Sidebar__itemIcon">
          <FontAwesomeIcon icon={faPatreon} title="Patreon" />
        </div>
        <span>Patreon</span>
      </button>
      <button
        className="Sidebar__item"
        onClick={() => ipcRenderer.send('openKofiPage')}
      >
        <div className="Sidebar__itemIcon">
          <FontAwesomeIcon icon={faCoffee} title="Ko-fi" />
        </div>
        <span>Ko-fi</span>
      </button>
      {isFullscreen && <QuitButton />}
    </div>
  )
}
