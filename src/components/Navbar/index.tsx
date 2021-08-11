import './index.css'

import React, { lazy } from 'react'

import { NavLink } from 'react-router-dom'
import { createNewWindow } from 'src/helpers'
import { useTranslation } from 'react-i18next'

const UserSelector = lazy(() => import('./components/UserSelector'))

export default function NavBar() {
  const { t, i18n } = useTranslation()
  let lang = i18n.language
  if (i18n.language === 'pt') {
    lang = 'pt-BR'
  }
  const epicStore = `https://www.epicgames.com/store/${lang}/`
  const wiki = 'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki'
  return (
    <div className="NavBar">
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
    </div>
  )
}
