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
import StoreLogos from 'frontend/components/UI/StoreLogos'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { NavLink, useLocation } from 'react-router-dom'
import classNames from 'classnames'
import React, { useContext, useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge
} from '@mui/material'
import { ExpandMore } from '@mui/icons-material'

import ContextProvider from 'frontend/state/ContextProvider'
import { DMQueueElement } from 'common/types'
import { LocationState } from 'frontend/types'
import CurrentDownload from '../CurrentDownload'

const SUB_SETTINGS_PATHS = {
  general: '/settings/app/default/general',
  gameDefaults: '/settings/app/default/games_settings',
  advanced: '/settings/app/default/advanced',
  systemInfo: '/settings/app/default/systeminfo',
  log: '/settings/app/default/log'
}

export default function MainLinks() {
  const { t } = useTranslation()
  const { state } = useLocation() as { state: LocationState }
  const location = useLocation() as { pathname: string }
  const [currentDMElement, setCurrentDMElement] = useState<DMQueueElement>()
  const lastDMElement = useRef<DMQueueElement>()

  const isStore = location.pathname.startsWith('/store')
  const isSettings = Object.values(SUB_SETTINGS_PATHS).includes(
    location.pathname
  )

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
      lastDMElement.current = currentDMElement
    }
  }, [currentDMElement])

  const isWin = platform === 'win32'

  const mainPath = SUB_SETTINGS_PATHS.general

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

  // use currentDMElement by default
  // if not, use last cached value for the sake of collapse animation
  const frozenDMQueueElement = currentDMElement || lastDMElement.current

  return (
    <div className="SidebarLinks Sidebar__section">
      {!loggedIn && (
        <NavLink
          className={({ isActive }) =>
            classNames('Sidebar__item', { active: isActive })
          }
          data-tooltip-content={t('button.login', 'Login')}
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
        data-tooltip-content={t('Library')}
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
        data-tooltip-content={t('stores', 'Stores')}
        tabIndex={-1}
      >
        <Accordion expanded={isStore}>
          <AccordionSummary tabIndex={-1} expandIcon={<ExpandMore />}>
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
                data-tooltip-content={t('store', 'Epic Store')}
                to="/store/epic"
              >
                <div className="Sidebar__itemIcon">
                  <StoreLogos runner="legendary" className="" />
                </div>
                <span>{t('store', 'Epic Store')}</span>
              </NavLink>
              <NavLink
                data-testid="store"
                className={({ isActive }) =>
                  classNames('Sidebar__item', 'SidebarLinks__subItem', {
                    active: isActive
                  })
                }
                data-tooltip-content={t('gog-store', 'GOG Store')}
                to="/store/gog"
              >
                <div className="Sidebar__itemIcon">
                  <StoreLogos runner="gog" className="" />
                </div>
                <span>{t('gog-store', 'GOG Store')}</span>
              </NavLink>
              <NavLink
                data-testid="store"
                className={({ isActive }) =>
                  classNames('Sidebar__item', 'SidebarLinks__subItem', {
                    active: isActive
                  })
                }
                data-tooltip-content={t('prime-gaming', 'Prime Gaming')}
                to="/store/amazon"
              >
                <div className="Sidebar__itemIcon">
                  <StoreLogos runner="nile" className="" />
                </div>
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
        data-tooltip-content={t('download-manager.link', 'Downloads')}
        to={{ pathname: '/download-manager' }}
      >
        <Accordion expanded={!!currentDMElement}>
          <AccordionSummary tabIndex={-1}>
            <div className="Sidebar__itemIcon">
              <Badge
                invisible={!currentDMElement}
                variant="dot"
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right'
                }}
              >
                <FontAwesomeIcon
                  icon={faDownload}
                  title={t('download-manager.link', 'Downloads')}
                />
              </Badge>
            </div>
            <span>{t('download-manager.link', 'Downloads')}</span>
          </AccordionSummary>
          <AccordionDetails>
            {frozenDMQueueElement && (
              <CurrentDownload
                key={frozenDMQueueElement.params.appName}
                appName={frozenDMQueueElement.params.appName}
                runner={frozenDMQueueElement.params.runner}
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
        data-tooltip-content={t('Settings')}
        tabIndex={-1}
      >
        <Accordion expanded={isSettings}>
          <AccordionSummary tabIndex={-1} expandIcon={<ExpandMore />}>
            <NavLink
              data-testid="settings"
              className={({ isActive }) =>
                classNames({
                  active: isActive || isSettings
                })
              }
              to={{ pathname: mainPath }}
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
                to={SUB_SETTINGS_PATHS.general}
                state={{ fromGameCard: false }}
                className={({ isActive }) =>
                  classNames('Sidebar__item SidebarLinks__subItem', {
                    active: isActive
                  })
                }
                data-tooltip-content={t('settings.navbar.general')}
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
                  to={SUB_SETTINGS_PATHS.gameDefaults}
                  state={{ ...state, runner: state?.runner }}
                  className={({ isActive }) =>
                    classNames('Sidebar__item SidebarLinks__subItem', {
                      active: isActive
                    })
                  }
                  data-tooltip-content={t(
                    'settings.navbar.games_settings_defaults',
                    'Game Defaults'
                  )}
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
                to={SUB_SETTINGS_PATHS.advanced}
                state={{ ...state, runner: state?.runner }}
                className={({ isActive }) =>
                  classNames('Sidebar__item SidebarLinks__subItem', {
                    active: isActive
                  })
                }
                data-tooltip-content={t('settings.navbar.advanced', 'Advanced')}
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
                to={SUB_SETTINGS_PATHS.systemInfo}
                state={{ ...state, runner: state?.runner }}
                className={({ isActive }) =>
                  classNames('Sidebar__item SidebarLinks__subItem', {
                    active: isActive
                  })
                }
                data-tooltip-content={t(
                  'settings.navbar.systemInformation',
                  'System Information'
                )}
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
                role="link"
                to={SUB_SETTINGS_PATHS.log}
                state={{ ...state, runner: state?.runner }}
                className={({ isActive }) =>
                  classNames('Sidebar__item SidebarLinks__subItem', {
                    active: isActive
                  })
                }
                data-tooltip-content={t('settings.navbar.log', 'Log')}
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
      <NavLink
        data-testid="accessibility"
        className={({ isActive }) =>
          classNames('Sidebar__item', {
            active: isActive
          })
        }
        to="/accessibility"
        data-tooltip-content={t('accessibility.title', 'Accessibility')}
      >
        <div className="Sidebar__itemIcon">
          <FontAwesomeIcon
            icon={faUniversalAccess}
            title={t('accessibility.title', 'Accessibility')}
          />
        </div>
        <span>{t('accessibility.title', 'Accessibility')}</span>
      </NavLink>
      {!isWin && (
        <NavLink
          className={({ isActive }) =>
            classNames('Sidebar__item', { active: isActive })
          }
          to={{ pathname: '/wine-manager' }}
          data-tooltip-content={t('wine.manager.link', 'Wine Manager')}
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
        <NavLink
          className="Sidebar__item"
          to={'/login'}
          data-tooltip-content={t(
            'userselector.manageaccounts',
            'Manage Accounts'
          )}
        >
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
