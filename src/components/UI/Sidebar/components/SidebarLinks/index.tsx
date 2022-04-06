import {
  faBookOpen,
  faGamepad,
  faSlidersH,
  faStore,
  faUser
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import cx from 'classnames'
import ElectronStore from 'electron-store'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useHistory, useLocation } from 'react-router-dom'
import { getAppSettings } from 'src/helpers'
import ContextProvider from 'src/state/ContextProvider'
import './index.css'

const Store = window.require('electron-store')
const configStore: ElectronStore = new Store({
  cwd: 'store'
})
const gogStore: ElectronStore = new Store({
  cwd: 'gog_store'
})

export default function SidebarLinks() {
  const { t } = useTranslation()
  const history = useHistory()
  const [showUnrealMarket, setShowUnrealMarket] = useState(false)

  const { category, handleCategory, handleFilter } = useContext(ContextProvider)

  const location = useLocation() as { pathname: string }
  const isLibrary = location.pathname === '/'
  const isStore = location.pathname.includes('store')
  const isEpicLoggedIn = Boolean(configStore.get('userInfo'))
  const isGOGLoggedIn = Boolean(gogStore.get('credentials'))
  const showSidebar =
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
      {showSidebar && (
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
        data-testid="settings"
        isActive={(match, location) => location.pathname.includes('settings')}
        to={{ pathname: '/settings/default/general' }}
      >
        <div className="Sidebar__itemIcon">
          <FontAwesomeIcon icon={faSlidersH} />
        </div>
        {t('Settings')}
      </NavLink>
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
