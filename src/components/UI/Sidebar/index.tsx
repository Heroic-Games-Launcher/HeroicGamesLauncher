import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'
import cx from 'classnames'

import ContextProvider from 'src/state/ContextProvider'
import { UserSelector } from './components'
import SupportLinks from './components/SupportLinks'

import './index.css'
import LayoutSelection from './components/LayoutSelection'

export default function Sidebar() {
  const { t } = useTranslation()

  const { category, handleCategory, handleFilter } = useContext(ContextProvider)

  const location = useLocation() as {pathname: string}
  const isLibrary = location.pathname === '/'

  function toggleCategory(newCategory: string) {
    if (category !== newCategory) {
      handleCategory(newCategory)
      handleFilter(newCategory === 'unreal' ? 'unreal' : 'all')
    }
  }

  return (
    <aside className="sidebar">
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
          {t('Library')}
        </NavLink>
        {isLibrary && (<><span onClick={() => toggleCategory('games')} className={cx('subItem', {['selected']: category === 'games'})}>
          {t('Games', 'Games')}
        </span>
        <span onClick={() => toggleCategory('unreal')} className={cx('subItem', {['selected']: category === 'unreal'})}>
          {t('Unreal Marketplace', 'Unreal Marketplace')}
        </span></>)}
        <NavLink
          data-testid="settings"
          activeStyle={{ color: 'var(--secondary)', fontWeight: 500 }}
          isActive={(match, location) => location.pathname.includes('settings')}
          to={{
            pathname: '/settings/default/general'
          }}
        >
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
          {t('wiki', 'Wiki')}
        </NavLink>
        <LayoutSelection />
      </div>
      <SupportLinks />
      <UserSelector />
    </aside>
  )
}
