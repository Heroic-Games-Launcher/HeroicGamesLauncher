import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, useLocation } from 'react-router-dom'
import ElectronStore from 'electron-store'

import cx from 'classnames'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faStore,
  faSlidersH,
  faBookOpen,
  faGamepad,
  faUser
} from '@fortawesome/free-solid-svg-icons'
const Store = window.require('electron-store')
const configStore: ElectronStore = new Store({
  cwd: 'store'
})
const gogStore: ElectronStore = new Store({
  cwd: 'gog_store'
})

import ContextProvider from 'src/state/ContextProvider'
import './index.css'
import { getAppSettings } from 'src/helpers'
const { ipcRenderer } = window.require('electron')

export default function SidebarLinks() {
  const { t } = useTranslation()
  const [showUnrealMarket, setShowUnrealMarket] = useState(false)

  const { category, handleCategory, handleFilter } = useContext(ContextProvider)

  const location = useLocation() as { pathname: string }
  const isLibrary = location.pathname === '/'
  const isEpicLoggedIn = Boolean(configStore.get('userInfo'))
  const showSubmenu = isLibrary && isEpicLoggedIn

  function toggleCategory(newCategory: string) {
    if (category !== newCategory) {
      handleCategory(newCategory)
      handleFilter(newCategory === 'unreal' ? 'unreal' : 'all')
    }
  }

  function handleGOG() {
    if (gogStore.has('credentials')) {
      handleCategory('gog')
    } else {
      // Login
      ipcRenderer.send('openGOGLoginPage')
    }
  }

  useEffect(() => {
    getAppSettings().then(({ showUnrealMarket }) =>
      setShowUnrealMarket(showUnrealMarket)
    )
  }, [])

  return (
    <div className="Links">
      <NavLink
        data-testid="library"
        activeStyle={{ color: 'var(--secondary)', fontWeight: 500 }}
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
        to="/"
      >
        <FontAwesomeIcon
          style={{ width: 'clamp(2vh, 25px, 30px)' }}
          icon={isEpicLoggedIn ? faGamepad : faUser}
        />
        {isEpicLoggedIn ? t('Library') : t('button.login', 'Login')}
      </NavLink>
      {showSubmenu && (
        <>
          <a
            href="#"
            onClick={() => toggleCategory('epic')}
            className={cx('subItem', { ['selected']: category === 'epic' })}
          >
            {t('Epic Games', 'Epic Games')}
          </a>
          <a
            href="#"
            onClick={handleGOG}
            className={cx('subItem', { ['selected']: category === 'gog' })}
          >
            {t('GOG', 'GOG')}
          </a>
          {showUnrealMarket && (
            <a
              href="#"
              onClick={() => toggleCategory('unreal')}
              className={cx('subItem', { ['selected']: category === 'unreal' })}
            >
              {t('Unreal Marketplace', 'Unreal Marketplace')}
            </a>
          )}
        </>
      )}
      {!isEpicLoggedIn && (
        <>
          <Link
            to="/"
            className={cx('subItem', {
              ['selected']: location.pathname === '/'
            })}
          >
            {t('login.loginWithEpic', 'Login With Epic')}
          </Link>
          <Link
            to="/login"
            className={cx('subItem', {
              ['selected']: location.pathname === '/login'
            })}
          >
            {t('login.loginWithSid', 'Login with SID')}
          </Link>
        </>
      )}
      <NavLink
        data-testid="settings"
        activeStyle={{ color: 'var(--secondary)', fontWeight: 500 }}
        isActive={(match, location) => location.pathname.includes('settings')}
        to={{
          pathname: '/settings/default/general'
        }}
      >
        <FontAwesomeIcon
          style={{ width: 'clamp(1vh, 22px, 28px)' }}
          icon={faSlidersH}
        />

        {t('Settings')}
      </NavLink>
      <NavLink
        data-testid="store"
        activeStyle={{ color: 'var(--secondary)', fontWeight: 500 }}
        isActive={(match, location) => location.pathname.includes('epicstore')}
        to={{
          pathname: '/epicstore'
        }}
      >
        <FontAwesomeIcon
          style={{ width: 'clamp(1vh, 22px, 28px)' }}
          icon={faStore}
        />
        {t('store', 'Store')}
      </NavLink>
      <NavLink
        data-testid="wiki"
        activeStyle={{ color: 'var(--secondary)', fontWeight: 500 }}
        isActive={(match, location) => location.pathname.includes('wiki')}
        to={{
          pathname: '/wiki'
        }}
      >
        <FontAwesomeIcon
          style={{ width: 'clamp(1vh, 22px, 28px)' }}
          icon={faBookOpen}
        />
        {t('wiki', 'Wiki')}
      </NavLink>
    </div>
  )
}
