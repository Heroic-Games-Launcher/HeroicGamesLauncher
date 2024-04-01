import {
  faGamepad,
  faSlidersH,
  faStore,
  faUser,
  faUniversalAccess,
  faUserAlt,
  faWineGlass,
  faDownload,
  faScroll,
  faCircleInfo,
  faCog,
  faWrench,
  faChessKnight
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { NavLink, useLocation } from 'react-router-dom'
import classNames from 'classnames'
import React, { useContext, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material'

import ContextProvider from 'frontend/state/ContextProvider'
import { Runner, DMQueueElement } from 'common/types'
import { LocationState } from 'frontend/types'
import CurrentDownload from '../CurrentDownload'

type PathSplit = [
  a: undefined,
  b: undefined,
  runner: Runner | 'app',
  appName: string,
  type: string
]

export default function MainLinks() {
  const { t } = useTranslation()
  const { state } = useLocation() as { state: LocationState }
  const location = useLocation() as { pathname: string }
  const [, , runner = 'app', appName = 'default', type] = location.pathname.split('/') as PathSplit
  const [currentDMElement, setCurrentDMElement] = useState<DMQueueElement>()
  const [lastDMElement, setLastDMElement] = useState<DMQueueElement>()

  const isStore = location.pathname.startsWith('/store')
  const isSettings = location.pathname.startsWith('/settings') || location.pathname === '/accessibility'

  const { amazon, epic, gog, platform, refreshLibrary } =
    useContext(ContextProvider)

  useEffect(() => {
    window.api.getDMQueueInformation().then(({ elements }) => {
      setCurrentDMElement(elements[0])
    })

    const removeHandleDMQueueInformation = window.api.handleDMQueueInformation(
      (e, elements) => {
        setCurrentDMElement(elements[0])
      }
    )

    return () => {
      removeHandleDMQueueInformation()
    }
  }, [])

  //guard lastDMElement from null values
  useEffect(() => {
    if (currentDMElement) {
      setLastDMElement(currentDMElement)
    }
  }, [currentDMElement])

  const isWin = platform === 'win32'

  const settingsPath = '/settings/app/default/general'

  const loggedIn = epic.username || gog.username || amazon.user_id

  async function handleRefresh() {
    localStorage.setItem('scrollPosition', '0')

    const shouldRefresh =
      (epic.username && !epic.library.length) ||
      (gog.username && !gog.library.length) ||
      (amazon.user_id && !amazon.library.length)
    if (shouldRefresh) {
      return refreshLibrary({ runInBackground: true })
    }
    return
  }

  // By default, open Epic Store
  let defaultStore = 'epic'
  if (!epic.username && !gog.username && amazon.user_id) {
    // If only logged in to Amazon Games, open Amazon Gaming
    defaultStore = 'amazon'
  } else if (!epic.username && gog.username) {
    // Otherwise, if not logged in to Epic Games, open GOG Store
    defaultStore = 'gog'
  }

  // if we have a stored last-url, default to the `/last-url` route
  const lastStore = sessionStorage.getItem('last-store')
  if (lastStore) {
    defaultStore = lastStore
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
          <div className="Sidebar__itemIcon">
            <FontAwesomeIcon icon={faUser} title={t('button.login', 'Login')} />
          </div>
          <span>{t('button.login', 'Login')}</span>
        </NavLink>
      )}
      <NavLink
        className={({ isActive }) =>
          classNames('Sidebar__item', {
            active: isActive || location.pathname.includes('gamepage')
          })
        }
        to={'/'}
        onClick={async () => handleRefresh()}
      >
        <div className="Sidebar__itemIcon">
          <FontAwesomeIcon icon={faGamepad} title={t('Library')} />
        </div>
        <span>{t('Library')}</span>
      </NavLink>
      <div
        className={classNames('Sidebar__item', {
          active: isStore
        })}
        tabIndex={-1}
      >
        <Accordion expanded={isStore}>
          <AccordionSummary tabIndex={-1}>
            <NavLink
              className={({ isActive }) =>
                classNames({
                  active: isActive || isStore
                })
              }
              to={`/store/${defaultStore}`}
            >
              <div className="Sidebar__itemIcon">
                <FontAwesomeIcon icon={faStore} title={t('stores', 'Stores')} />
              </div>
              <span>{t('stores', 'Stores')}</span>
            </NavLink>
          </AccordionSummary>
          <AccordionDetails>
            <div className="SidebarSubmenu">
              <NavLink
                data-testid="store"
                className={({ isActive }) =>
                  classNames('Sidebar__item', 'SidebarLinks__subItem', {
                    active: isActive
                  })
                }
                to="/store/epic"
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
                to="/store/gog"
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
                to="/store/amazon"
              >
                <span>{t('prime-gaming', 'Prime Gaming')}</span>
              </NavLink>
            </div>
          </AccordionDetails>
        </Accordion>
      </div>
      <NavLink
        className={({ isActive }) =>
          classNames('Sidebar__item', { active: isActive })
        }
        to={{ pathname: '/download-manager' }}
      >
        <Accordion expanded={!!currentDMElement}>
          <AccordionSummary tabIndex={-1}>
            <div className="Sidebar__itemIcon">
              <FontAwesomeIcon
                icon={faDownload}
                title={t('download-manager.link', 'Downloads')}
              />
            </div>
            <span>{t('download-manager.link', 'Downloads')}</span>
          </AccordionSummary>
          <AccordionDetails>
            {lastDMElement && (
              <CurrentDownload
                key={lastDMElement.params.appName}
                appName={lastDMElement.params.appName}
                runner={lastDMElement.params.runner}
              />
            )}
          </AccordionDetails>
        </Accordion>
      </NavLink>
      <div className="divider" />
      <div
        className={classNames('Sidebar__item', {
          active: isSettings
        })}
        tabIndex={-1}
      >
        <Accordion expanded={isSettings}>
          <AccordionSummary tabIndex={-1}>
            <NavLink
              data-testid="settings"
              className={({ isActive }) =>
                classNames({
                  active: isActive || isSettings
                })
              }
              to={{ pathname: settingsPath }}
              state={{
                fromGameCard: false
              }}
            >
              <div className="Sidebar__itemIcon">
                <FontAwesomeIcon icon={faSlidersH} title={t('Settings')} />
              </div>
              <span>{t('Settings', 'Settings')}</span>
            </NavLink>
          </AccordionSummary>
          <AccordionDetails>
            <div className="SidebarSubmenu settings">
              <NavLink
                role="link"
                to={{ pathname: '/settings/app/default/general' }}
                state={{ fromGameCard: false }}
                className={classNames('Sidebar__item SidebarLinks__subItem', {
                  ['active']: type === 'general'
                })}
              >
                <div className="Sidebar__itemIcon">
                  <FontAwesomeIcon
                    icon={faCog}
                    title={t('settings.navbar.general')}
                  />
                </div>
                <span>{t('settings.navbar.general')}</span>
              </NavLink>
              {!isWin && (
                <NavLink
                  role="link"
                  to={`/settings/${runner}/${appName}/games_settings`}
                  state={{ ...state, runner: state?.runner }}
                  className={classNames('Sidebar__item SidebarLinks__subItem', {
                    ['active']: type === 'games_settings'
                  })}
                >
                  <div className="Sidebar__itemIcon">
                    <FontAwesomeIcon
                      icon={faChessKnight}
                      title={t(
                        'settings.navbar.games_settings_defaults',
                        'Game Defaults'
                      )}
                    />
                  </div>
                  <span>
                    {t(
                      'settings.navbar.games_settings_defaults',
                      'Game Defaults'
                    )}
                  </span>
                </NavLink>
              )}
              <NavLink
                role="link"
                to={`/settings/${runner}/${appName}/advanced`}
                state={{ ...state, runner: state?.runner }}
                className={classNames('Sidebar__item SidebarLinks__subItem', {
                  ['active']: type === 'advanced'
                })}
              >
                <div className="Sidebar__itemIcon">
                  <FontAwesomeIcon
                    icon={faWrench}
                    title={t('settings.navbar.advanced', 'Advanced')}
                  />
                </div>
                <span>{t('settings.navbar.advanced', 'Advanced')}</span>
              </NavLink>
              <NavLink
                role="link"
                to={`/settings/${runner}/${appName}/systeminfo`}
                state={{ ...state, runner: state?.runner }}
                className={classNames('Sidebar__item SidebarLinks__subItem', {
                  ['active']: type === 'systeminfo'
                })}
              >
                <div className="Sidebar__itemIcon">
                  <FontAwesomeIcon
                    icon={faCircleInfo}
                    title={t(
                      'settings.navbar.systemInformation',
                      'System Information'
                    )}
                  />
                </div>
                <span>
                  {t('settings.navbar.systemInformation', 'System Information')}
                </span>
              </NavLink>
              <NavLink
                data-testid="accessibility"
                className={({ isActive }) =>
                  classNames('Sidebar__item SidebarLinks__subItem', {
                    active: isActive
                  })
                }
                to={{ pathname: '/accessibility' }}
              >
                <div className="Sidebar__itemIcon">
                  <FontAwesomeIcon
                    icon={faUniversalAccess}
                    title={t('accessibility.title', 'Accessibility')}
                  />
                </div>
                <span>{t('accessibility.title', 'Accessibility')}</span>
              </NavLink>
              <NavLink
                role="link"
                to={`/settings/${runner}/${appName}/log`}
                state={{ ...state, runner: state?.runner }}
                className={classNames('Sidebar__item SidebarLinks__subItem', {
                  ['active']: type === 'log'
                })}
              >
                <div className="Sidebar__itemIcon">
                  <FontAwesomeIcon
                    icon={faScroll}
                    title={t('settings.navbar.log', 'Log')}
                  />
                </div>
                <span>{t('settings.navbar.log', 'Log')}</span>
              </NavLink>
            </div>
          </AccordionDetails>
        </Accordion>
      </div>
      {!isWin && (
        <NavLink
          className={({ isActive }) =>
            classNames('Sidebar__item', { active: isActive })
          }
          to={{ pathname: '/wine-manager' }}
        >
          <div className="Sidebar__itemIcon">
            <FontAwesomeIcon
              icon={faWineGlass}
              title={t('wine.manager.link', 'Wine Manager')}
            />
          </div>
          <span>{t('wine.manager.link', 'Wine Manager')}</span>
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
    </div>
  )
}
