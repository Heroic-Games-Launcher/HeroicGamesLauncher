import {
  faBookOpen,
  faGamepad,
  faSlidersH,
  faStore,
  faUser,
  faUniversalAccess,
  faCoffee,
  faUserAlt,
  faWineGlass,
  faBarsProgress
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { NavLink, useLocation } from 'react-router-dom'
import classNames from 'classnames'
import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { faDiscord, faPatreon } from '@fortawesome/free-brands-svg-icons'
import { openDiscordLink } from 'frontend/helpers'

import ContextProvider from 'frontend/state/ContextProvider'
import { Runner } from 'common/types'
import './index.css'
import QuitButton from '../QuitButton'
import { LocationState } from 'frontend/types'
import { SHOW_EXTERNAL_LINK_DIALOG_STORAGE_KEY } from 'frontend/components/UI/ExternalLinkDialog'

type PathSplit = [
  a: undefined,
  b: undefined,
  runner: Runner | 'app',
  appName: string,
  type: string
]

export default function SidebarLinks() {
  const { t } = useTranslation()
  const { state } = useLocation() as { state: LocationState }
  const location = useLocation() as { pathname: string }
  const [, , runner, appName, type] = location.pathname.split('/') as PathSplit

  const {
    amazon,
    epic,
    gog,
    platform,
    refreshLibrary,
    handleExternalLinkDialog
  } = useContext(ContextProvider)

  const isStore = location.pathname.includes('store')
  const isSettings = location.pathname.includes('settings')
  const isWin = platform === 'win32'

  const settingsPath = '/settings/app/default/general'

  const loggedIn = epic.username || gog.username || amazon.username

  async function handleRefresh() {
    localStorage.setItem('scrollPosition', '0')

    const shouldRefresh =
      (epic.username && !epic.library.length) ||
      (gog.username && !gog.library.length) ||
      (amazon.username && !amazon.library.length)
    if (shouldRefresh) {
      return refreshLibrary({ runInBackground: true })
    }
    return
  }

  function handleExternalLink(linkCallback: () => void) {
    const showExternalLinkDialog: boolean = JSON.parse(
      localStorage.getItem(SHOW_EXTERNAL_LINK_DIALOG_STORAGE_KEY) ?? 'true'
    )
    if (showExternalLinkDialog) {
      handleExternalLinkDialog({ showDialog: true, linkCallback })
    } else {
      linkCallback()
    }
  }

  // By default, open Epic Store
  let defaultStore = '/epicstore'
  if (!epic.username && !gog.username && amazon.username) {
    // If only logged in to Amazon Games, open Amazon Gaming
    defaultStore = '/amazonstore'
  } else if (!epic.username && gog.username) {
    // Otherwise, if not logged in to Epic Games, open GOG Store
    defaultStore = '/gogstore'
  }

  return (
    <div className="SidebarLinks Sidebar__section">
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
      <NavLink
        className={({ isActive }) =>
          classNames('Sidebar__item', {
            active: isActive || location.pathname.includes('gamepage')
          })
        }
        to={'/library'}
        onClick={async () => handleRefresh()}
      >
        <>
          <div className="Sidebar__itemIcon">
            <FontAwesomeIcon icon={faGamepad} title={t('Library')} />
          </div>
          <span>{t('Library')}</span>
        </>
      </NavLink>
      <div className="SidebarItemWithSubmenu">
        <NavLink
          className={({ isActive }) =>
            classNames('Sidebar__item', {
              active: isActive || location.pathname.includes('store')
            })
          }
          to={defaultStore}
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
            <NavLink
              data-testid="store"
              className={({ isActive }) =>
                classNames('Sidebar__item', 'SidebarLinks__subItem', {
                  active: isActive
                })
              }
              to="/amazonstore"
            >
              <span>{t('prime-gaming', 'Prime Gaming')}</span>
            </NavLink>
          </div>
        )}
      </div>
      <div className="divider" />
      <div className="SidebarItemWithSubmenu">
        <NavLink
          data-testid="settings"
          className={({ isActive }) =>
            classNames('Sidebar__item', {
              active: isActive || location.pathname.includes('settings')
            })
          }
          to={{ pathname: settingsPath }}
          state={{
            fromGameCard: false
          }}
        >
          <>
            <div className="Sidebar__itemIcon">
              <FontAwesomeIcon icon={faSlidersH} title={t('Settings')} />
            </div>
            <span>{t('Settings', 'Settings')}</span>
          </>
        </NavLink>
        {isSettings && (
          <div className="SidebarSubmenu settings">
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
            <NavLink
              role="link"
              to={`/settings/${runner}/${appName}/games_settings`}
              state={{ ...state, runner: state?.runner }}
              className={classNames('Sidebar__item SidebarLinks__subItem', {
                ['active']: type === 'games_settings'
              })}
            >
              <span>
                {t('settings.navbar.games_settings_defaults', 'Game Defaults')}
              </span>
            </NavLink>
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
      <NavLink
        className={({ isActive }) =>
          classNames('Sidebar__item', { active: isActive })
        }
        to={{ pathname: '/download-manager' }}
      >
        <>
          <div className="Sidebar__itemIcon">
            <FontAwesomeIcon
              icon={faBarsProgress}
              title={t('download-manager.link', 'Downloads')}
            />
          </div>
          <span>{t('download-manager.link', 'Downloads')}</span>
        </>
      </NavLink>
      {!isWin && (
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
      {loggedIn && (
        <NavLink className="Sidebar__item" to={'/login'}>
          <div className="Sidebar__itemIcon">
            <FontAwesomeIcon
              icon={faUserAlt}
              title={t('userselector.manageaccounts', 'Manage Accounts')}
            />
          </div>
          <span>{t('userselector.manageaccounts', 'Manage Accounts')}</span>
        </NavLink>
      )}
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
      <button
        className="Sidebar__item"
        onClick={() => handleExternalLink(openDiscordLink)}
      >
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
        onClick={() => handleExternalLink(window.api.openPatreonPage)}
      >
        <div className="Sidebar__itemIcon">
          <FontAwesomeIcon icon={faPatreon} title="Patreon" />
        </div>
        <span>Patreon</span>
      </button>
      <button
        className="Sidebar__item"
        onClick={() => handleExternalLink(window.api.openKofiPage)}
      >
        <div className="Sidebar__itemIcon">
          <FontAwesomeIcon icon={faCoffee} title="Ko-fi" />
        </div>
        <span>Ko-fi</span>
      </button>
      <QuitButton />
    </div>
  )
}
