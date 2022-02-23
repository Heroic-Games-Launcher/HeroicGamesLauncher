import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useHistory, useLocation } from 'react-router-dom'
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
  function toggleCategory(newCategory: string) {
    if (category !== newCategory) {
      handleCategory(newCategory)
      handleFilter(newCategory === 'unreal' ? 'unreal' : 'all')
    }
  }

  useEffect(() => {
    getAppSettings().then(({ showUnrealMarket }) =>
      setShowUnrealMarket(showUnrealMarket)
    )
    if (!isEpicLoggedIn && !isGOGLoggedIn) {
      return history.push('/login')
    }
  }, [])

  return (
    <div className="Links">
      <NavLink
        data-testid="library"
        activeStyle={{
          color: 'var(--accent)',
          font: 'var(--font-primary-bold)'
        }}
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
        <FontAwesomeIcon
          style={{ width: 'clamp(2vh, 25px, 30px)' }}
          icon={displayIcon}
        />
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
              className={cx('subItem', { ['selected']: category === 'epic' })}
            >
              {t('Epic Games', 'Epic Games')}
            </a>
          )}
          {isGOGLoggedIn && (
            <a
              href="#"
              onClick={() => toggleCategory('gog')}
              className={cx('subItem', { ['selected']: category === 'gog' })}
            >
              {t('GOG', 'GOG')}
            </a>
          )}
          {showUnrealMarket && isEpicLoggedIn && (
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
      <NavLink
        data-testid="settings"
        activeStyle={{
          color: 'var(--accent)',
          font: 'var(--font-primary-bold)'
        }}
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
        to={{
          pathname: '/epicstore'
        }}
        activeStyle={{
          color: 'var(--accent)'
        }}
        isActive={(match, location) => location.pathname.includes('store')}
      >
        <FontAwesomeIcon
          style={{ width: 'clamp(1vh, 22px, 28px)' }}
          icon={faStore}
        />
        {t('stores', 'Stores')}
      </NavLink>
      {isStore && (
        <>
          <NavLink
            data-testid="store"
            activeStyle={{
              color: 'var(--accent)'
            }}
            className="subItem"
            isActive={(match, location) =>
              location.pathname.includes('epicstore')
            }
            to={{
              pathname: '/epicstore'
            }}
          >
            {t('store', 'Epic Store')}
          </NavLink>
          <NavLink
            data-testid="store"
            activeStyle={{
              color: 'var(--accent)'
            }}
            className="subItem"
            isActive={(match, location) =>
              location.pathname.includes('gogstore')
            }
            to={{
              pathname: '/gogstore'
            }}
          >
            {t('gog-store', 'GOG Store')}
          </NavLink>
        </>
      )}
      <NavLink
        data-testid="wiki"
        activeStyle={{
          color: 'var(--accent)',
          font: 'var(--font-primary-bold)'
        }}
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
