import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'
import cx from 'classnames'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faStore,
  faSlidersH,
  faBookOpen,
  faGamepad
} from '@fortawesome/free-solid-svg-icons'

import ContextProvider from 'src/state/ContextProvider'
import './index.css'

export default function SidebarLinks() {
  const { t } = useTranslation()

  const { category, handleCategory, handleFilter } = useContext(ContextProvider)

  const location = useLocation() as { pathname: string }
  const isLibrary = location.pathname === '/'

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
          icon={faGamepad}
        />
        {t('Library')}
      </NavLink>
      {isLibrary && (
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
        data-testid="wine-ge"
        activeStyle={{ color: 'var(--secondary)', fontWeight: 500 }}
        isActive={(match, location) => location.pathname.includes('wine-ge')}
        to={{
          pathname: '/wine-ge'
        }}
      >
        {t('WineGE')}
      </NavLink>
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
