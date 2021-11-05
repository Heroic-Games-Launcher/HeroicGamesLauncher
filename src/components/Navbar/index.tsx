import './index.css'

import React, { lazy } from 'react'

import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SupportLinks from './components/SupportLinks'

const UserSelector = lazy(() => import('./components/UserSelector'))

export default function NavBar() {
  const { t } = useTranslation()
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
      </div>
      <SupportLinks />
      <UserSelector />
    </div>
  )
}
