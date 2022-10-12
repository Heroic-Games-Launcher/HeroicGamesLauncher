import {
  faBookOpen,
  faGamepad,
  faSlidersH,
  faStore,
  faUser,
  faUniversalAccess,
  faCoffee,
  faUserAlt,
  faWineGlass
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import classNames from 'classnames'
import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { faDiscord, faPatreon } from '@fortawesome/free-brands-svg-icons'
import { openDiscordLink, getGameInfo } from 'frontend/helpers'

import ContextProvider from 'frontend/state/ContextProvider'
import { Runner, GameInfo } from 'common/types'
import './index.css'
import QuitButton from '../QuitButton'
import { LocationState } from 'frontend/types'

type PathSplit = [
  a: undefined,
  b: undefined,
  runner: Runner | 'app',
  appName: string,
  type: string
]

export default function SidebarLinks() {
  const [gameInfo, setGameInfo] = useState<Partial<GameInfo>>({
    cloud_save_enabled: false,
    is_installed: false
  })
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { state } = useLocation() as { state: LocationState }
  const location = useLocation() as { pathname: string }
  const [, , runner, appName, type] = location.pathname.split('/') as PathSplit

  const { epic, gog, platform, activeController } = useContext(ContextProvider)

  const isStore = location.pathname.includes('store')
  const isSettings = location.pathname.includes('settings')
  const [isDefaultSetting, setIsDefaultSetting] = useState(true)
  const [settingsPath, setSettingsPath] = useState(
    '/settings/app/default/general'
  )
  const [isFullscreen, setIsFullscreen] = useState(false)

  const { isLinuxNative = false, isMacNative = false } = state || {}
  const isWin = platform === 'win32'
  const isMac = platform === 'darwin'
  const isLinuxGame = isLinuxNative && platform === 'linux'
  const isMacGame = isMacNative && isMac
  const isLinux = platform === 'linux'

  const shouldRenderWineSettings = !isWin && !isMacGame && !isLinuxGame

  const loggedIn = epic.username || gog.username

  useEffect(() => {
    if (!runner || runner === 'app') {
      setIsDefaultSetting(true)
      setGameInfo({ ...gameInfo, cloud_save_enabled: false })
      setSettingsPath('/settings/app/default/general')
    } else {
      getGameInfo(appName, runner).then((info) => {
        setGameInfo(info)
        if (info?.is_installed) {
          setIsDefaultSetting(false)
          const wineOrOther = isWin
            ? `/settings/${runner}/${appName}/other`
            : `/settings/${runner}/${appName}/wine`
          setSettingsPath(wineOrOther)
        }
      })
    }
  }, [location])

  useEffect(() => {
    window.api.isFullscreen().then((res) => setIsFullscreen(res))
  }, [])

  useEffect(() => {
    if (!runner || runner === 'app') {
      return setIsDefaultSetting(true)
    }
  }, [location])

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
          state={{
            fromGameCard: false,
            runner: runner,
            hasCloudSave: gameInfo?.cloud_save_enabled
          }}
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
                to={{ pathname: '/settings/app/default/general' }}
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
                  to={`/settings/${runner}/${appName}/wine`}
                  state={{ ...state, runner: state?.runner }}
                  className={classNames('Sidebar__item SidebarLinks__subItem', {
                    ['active']: type === 'wine'
                  })}
                >
                  <span>{isMac ? 'Crossover' : 'Wine'}</span>
                </NavLink>
                {isLinux && (
                  <NavLink
                    role="link"
                    to={`/settings/${runner}/${appName}/wineExt`}
                    state={{ ...state, runner: state?.runner }}
                    className={classNames(
                      'Sidebar__item SidebarLinks__subItem',
                      {
                        ['active']: type === 'wineExt'
                      }
                    )}
                  >
                    <span>
                      {t('settings.navbar.wineExt', 'Wine Extensions')}
                    </span>
                  </NavLink>
                )}
              </>
            )}
            {gameInfo.cloud_save_enabled && !isLinuxGame && (
              <NavLink
                role="link"
                data-testid="linkSync"
                to={`/settings/${runner}/${appName}/sync`}
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
              to={`/settings/${runner}/${appName}/other`}
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
                to={`/settings/${runner}/${appName}/advanced`}
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
              to={`/settings/${runner}/${appName}/log`}
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
      <button className="Sidebar__item" onClick={window.api.openPatreonPage}>
        <div className="Sidebar__itemIcon">
          <FontAwesomeIcon icon={faPatreon} title="Patreon" />
        </div>
        <span>Patreon</span>
      </button>
      <button className="Sidebar__item" onClick={window.api.openKofiPage}>
        <div className="Sidebar__itemIcon">
          <FontAwesomeIcon icon={faCoffee} title="Ko-fi" />
        </div>
        <span>Ko-fi</span>
      </button>
      {(isFullscreen || activeController) && <QuitButton />}
    </div>
  )
}
