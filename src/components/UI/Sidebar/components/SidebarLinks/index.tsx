import {
  faBookOpen,
  faGamepad,
  faSlidersH,
  faStore,
  faUser,
  faUniversalAccess
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import classNames from 'classnames'
import cx from 'classnames'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'
import { getAppSettings } from 'src/helpers'
import ContextProvider from 'src/state/ContextProvider'
import { Category, Runner } from 'src/types'
import './index.css'

interface LocationState {
  fromGameCard: boolean
  hasCloudSave: boolean
  runner: Runner
  isLinuxNative: boolean
  isMacNative: boolean
}

export default function SidebarLinks() {
  const { t } = useTranslation()
  const [showUnrealMarket, setShowUnrealMarket] = useState(false)
  const { state } = useLocation() as { state: LocationState }
  const location = useLocation() as { pathname: string }
  const [appName, type] = location.pathname
    .replaceAll('/settings/', '')
    .split('/')

  const { epic, gog, category, handleCategory, handleFilter, platform } =
    useContext(ContextProvider)

  const isLibrary = location.pathname === '/'
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

  const shouldRenderWineSettings = !isWin && !isMacGame && !isLinuxGame

  const showLibrarySubmenu =
    ((epic.username && gog.username) || (epic.username && showUnrealMarket)) &&
    isLibrary

  const loggedIn = epic.username || gog.username

  const toggleCategory = useCallback(
    (newCategory: Category) => {
      if (category !== newCategory) {
        handleCategory(newCategory)
        handleFilter(newCategory === 'unreal' ? 'unreal' : 'all')
      }
    },
    [category, handleCategory, handleFilter]
  )

  useEffect(() => {
    getAppSettings().then(({ showUnrealMarket }) =>
      setShowUnrealMarket(showUnrealMarket)
    )
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
      {showLibrarySubmenu && (
        <>
          {epic.username && (
            <a
              href="#"
              onClick={() => toggleCategory('legendary')}
              className={cx('Sidebar__item SidebarLinks__subItem', {
                ['active']: category === 'legendary'
              })}
            >
              {t('Epic Games', 'Epic Games')}
            </a>
          )}
          {gog.username && (
            <a
              href="#"
              onClick={() => toggleCategory('gog')}
              className={cx('Sidebar__item SidebarLinks__subItem', {
                ['active']: category === 'gog'
              })}
            >
              {t('GOG', 'GOG')}
            </a>
          )}
          {showUnrealMarket && epic.username && (
            <a
              href="#"
              onClick={() => toggleCategory('unreal')}
              className={cx('Sidebar__item SidebarLinks__subItem', {
                ['active']: category === 'unreal'
              })}
            >
              {t('Unreal Marketplace', 'Unreal Marketplace')}
            </a>
          )}
        </>
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
              className={cx('Sidebar__item SidebarLinks__subItem', {
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
              className={cx('Sidebar__item SidebarLinks__subItem', {
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
              className={cx('Sidebar__item SidebarLinks__subItem', {
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
            className={cx('Sidebar__item SidebarLinks__subItem', {
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
              className={cx('Sidebar__item SidebarLinks__subItem', {
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
            className={cx('Sidebar__item SidebarLinks__subItem', {
              ['active']: type === 'log'
            })}
          >
            {t('settings.navbar.log', 'Log')}
          </NavLink>
        </>
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
            <FontAwesomeIcon icon={faUniversalAccess} />
          </div>
          {t('accessibility.title', 'Accessibility')}
        </>
      </NavLink>
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
    </div>
  )
}
