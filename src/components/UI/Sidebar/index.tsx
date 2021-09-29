import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'
import cx from 'classnames'

import { createNewWindow } from 'src/helpers'
import ContextProvider from 'src/state/ContextProvider'
import { UserSelector } from './components'

import './index.css'

export default function Sidebar() {
  const { t, i18n } = useTranslation()
  let lang = i18n.language
  if (i18n.language === 'pt') {
    lang = 'pt-BR'
  }
  const { category, handleCategory, handleFilter } = useContext(ContextProvider)

  const epicStore = `https://www.epicgames.com/store/${lang}/`
  const wiki = 'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki'
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
        <a
          data-testid="store"
          style={{ cursor: 'pointer' }}
          onClick={() => createNewWindow(epicStore)}
        >
          {t('store', 'Store')}
        </a>
        <a
          data-testid="wiki"
          style={{ cursor: 'pointer' }}
          onClick={() => createNewWindow(wiki)}
        >
          {t('wiki', 'Wiki')}
        </a>
      </div>
      <UserSelector />
    </aside>
  )
}
