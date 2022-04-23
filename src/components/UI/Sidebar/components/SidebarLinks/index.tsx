import {
  faBookOpen,
  faGamepad,
  faSlidersH,
  faStore,
  faUser
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import cx from 'classnames'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useHistory, useLocation } from 'react-router-dom'
import { getAppSettings } from 'src/helpers'
import { configStore, gogConfigStore } from 'src/helpers/electron_stores'
import ContextProvider from 'src/state/ContextProvider'
import { Runner } from 'src/types'
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
  const history = useHistory()
  const [showUnrealMarket, setShowUnrealMarket] = useState(false)
  const { state } = useLocation() as { state: LocationState }
  const location = useLocation() as { pathname: string }
  const [appName, type] = location.pathname
    .replaceAll('/settings/', '')
    .split('/')

  const { category, handleCategory, handleFilter, platform } =
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

  const isEpicLoggedIn = Boolean(configStore.get('userInfo'))
  const isGOGLoggedIn = Boolean(gogConfigStore.get('credentials'))
  const showLibrarySubmenu =
    ((isEpicLoggedIn && isGOGLoggedIn) ||
      (isEpicLoggedIn && showUnrealMarket)) &&
    isLibrary

  const pressAction = !isEpicLoggedIn && !isGOGLoggedIn ? '/login' : '/'
  const displayIcon = isEpicLoggedIn || isGOGLoggedIn ? faGamepad : faUser

  const toggleCategory = useCallback(
    (newCategory: string) => {
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
    if (!isEpicLoggedIn && !isGOGLoggedIn) {
      return history.push('/login')
    }
  }, [])

  return (
    <div className="SidebarLinks Sidebar__section">
      <NavLink
        className="Sidebar__item"
        data-testid="library"
        isActive={(match, location) => {
          if (match) {
            return true
          }
          return (
            location.pathname === '/login' ||
            location.pathname.includes('gameconfig')
          )
        }}
        exact
        to={pressAction}
      >
        <div className="Sidebar__itemIcon">
          <FontAwesomeIcon icon={displayIcon} />
        </div>
        {isEpicLoggedIn || isGOGLoggedIn
          ? t('Library')
          : t('button.login', 'Login')}
      </NavLink>
      {showLibrarySubmenu && (
        <>
          {isEpicLoggedIn && (
            <a
              href="#"
              onClick={() => toggleCategory('epic')}
              className={cx('Sidebar__item SidebarLinks__subItem', {
                ['active']: category === 'epic'
              })}
            >
              {t('Epic Games', 'Epic Games')}
            </a>
          )}
          {isGOGLoggedIn && (
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
          {showUnrealMarket && isEpicLoggedIn && (
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
        className="Sidebar__item"
        to={{ pathname: '/epicstore' }}
        isActive={(match, location) => location.pathname.includes('store')}
      >
        <div className="Sidebar__itemIcon">
          <FontAwesomeIcon icon={faStore} />
        </div>
        {t('stores', 'Stores')}
      </NavLink>
      {isStore && (
        <>
          <NavLink
            data-testid="store"
            className="Sidebar__item SidebarLinks__subItem"
            isActive={(match, location) =>
              location.pathname.includes('epicstore') ||
              (location.pathname === '/store-page' &&
                location.search.includes('epicgames.com/store'))
            }
            to={{ pathname: '/epicstore' }}
          >
            {t('store', 'Epic Store')}
          </NavLink>
          <NavLink
            data-testid="store"
            className="Sidebar__item SidebarLinks__subItem"
            isActive={(match, location) =>
              location.pathname.includes('gogstore') ||
              (location.pathname === '/store-page' &&
                location.search.includes('gog.com/en/game'))
            }
            to={{ pathname: '/gogstore' }}
          >
            {t('gog-store', 'GOG Store')}
          </NavLink>
        </>
      )}
      <NavLink
        className="Sidebar__item"
        data-testid="settings"
        isActive={(match, location) => location.pathname.includes('settings')}
        to={{ pathname: '/settings/default/general' }}
      >
        <div className="Sidebar__itemIcon">
          <FontAwesomeIcon icon={faSlidersH} />
        </div>
        {t('Settings')}
      </NavLink>
      {isSettings && (
        <>
          {isDefaultSetting && (
            <NavLink
              role="link"
              to={{ pathname: '/settings/default/general' }}
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
              to={{
                pathname: `/settings/${appName}/wine`,
                state: { ...state, runner: state?.runner }
              }}
              className={cx('Sidebar__item SidebarLinks__subItem', {
                ['active']: category === 'wine'
              })}
            >
              Wine
            </NavLink>
          )}
          {hasCloudSave && (
            <NavLink
              role="link"
              data-testid="linkSync"
              to={{
                pathname: `/settings/${appName}/sync`,
                state: { ...state, runner: state?.runner }
              }}
              className={cx('Sidebar__item SidebarLinks__subItem', {
                ['active']: type === 'sync'
              })}
            >
              {t('settings.navbar.sync')}
            </NavLink>
          )}
          <NavLink
            role="link"
            to={{
              pathname: `/settings/${appName}/other`,
              state: { ...state, runner: state?.runner }
            }}
            className={cx('Sidebar__item SidebarLinks__subItem', {
              ['active']: type === 'other'
            })}
          >
            {t('settings.navbar.other')}
          </NavLink>
          {isDefaultSetting && (
            <NavLink
              role="link"
              to={{
                pathname: `/settings/${appName}/advanced`,
                state: { ...state, runner: state?.runner }
              }}
              className={cx('Sidebar__item SidebarLinks__subItem', {
                ['active']: type === 'advanced'
              })}
            >
              {t('settings.navbar.advanced', 'Advanced')}
            </NavLink>
          )}
          <NavLink
            role="link"
            to={{
              pathname: `/settings/${appName}/log`,
              state: { ...state, runner: state?.runner }
            }}
            className={cx('Sidebar__item SidebarLinks__subItem', {
              ['active']: type === 'log'
            })}
          >
            {t('settings.navbar.log', 'Log')}
          </NavLink>
        </>
      )}
      <NavLink
        data-testid="wiki"
        className="Sidebar__item"
        isActive={(match, location) => location.pathname.includes('wiki')}
        to={{ pathname: '/wiki' }}
      >
        <div className="Sidebar__itemIcon">
          <FontAwesomeIcon icon={faBookOpen} />
        </div>
        {t('wiki', 'Wiki')}
      </NavLink>
    </div>
  )
}
