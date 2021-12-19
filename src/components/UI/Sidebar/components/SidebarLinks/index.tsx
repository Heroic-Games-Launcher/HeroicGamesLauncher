import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'
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

import ContextProvider from 'src/state/ContextProvider'
import './index.css'

export default function SidebarLinks() {
  const { t } = useTranslation()

  const { category, handleCategory, handleFilter } = useContext(ContextProvider)

  const location = useLocation() as { pathname: string }
  const isLibrary = location.pathname === '/'
  const isLoggedIn = Boolean(configStore.get('userInfo'))

  function toggleCategory(newCategory: string) {
    if (category !== newCategory) {
      handleCategory(newCategory)
      handleFilter(newCategory === 'unreal' ? 'unreal' : 'all')
    }
  }

  return (
    <div className="Links">
      <NavLink
        data-testid="library"
        activeStyle={{ color: 'var(--secondary)', fontWeight: 500 }}
        isActive={(match, location) => {
          if (match) {
            return true
          }
          return location.pathname.includes('gameconfig')
        }}
        exact
        to="/"
      >
        <FontAwesomeIcon
          style={{ width: 'clamp(2vh, 25px, 30px)' }}
          icon={isLoggedIn ? faGamepad : faUser}
        />
        {isLoggedIn ? t('Library') : t('Login')}
      </NavLink>
      {isLibrary && isLoggedIn && (
        <>
          <span
            onClick={() => toggleCategory('games')}
            className={cx('subItem', { ['selected']: category === 'games' })}
          >
            {t('Epic Games', 'Epic Games')}
          </span>
          <span
            onClick={() => toggleCategory('unreal')}
            className={cx('subItem', { ['selected']: category === 'unreal' })}
          >
            {t('Unreal Marketplace', 'Unreal Marketplace')}
          </span>
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
          style={{ width: 'clamp(2vh, 22px, 28px)' }}
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
          style={{ width: 'clamp(2vh, 22px, 28px)' }}
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
          style={{ width: 'clamp(2vh, 22px, 28px)' }}
          icon={faBookOpen}
        />
        {t('wiki', 'Wiki')}
      </NavLink>
    </div>
  )
}
