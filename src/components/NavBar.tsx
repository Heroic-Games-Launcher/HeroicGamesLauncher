import React from 'react'
import { NavLink } from 'react-router-dom'
import SearchBar from './UI/SearchBar'
import UserSelector from './UI/UserSelector'

export default function NavBar() {
  return (
    <div className="NavBar">
      <div className="Links">
        <NavLink
          activeStyle={{ color: '#FFA800', fontWeight: 500 }}
          isActive={(match, location) => {
            if (match) {
              return true
            }
            return location.pathname.includes('gameconfig')
          }}
          exact
          to="/"
        >
          Library
        </NavLink>
        <NavLink
          activeStyle={{ color: '#FFA800', fontWeight: 500 }}
          isActive={(match, location) => location.pathname.includes('settings')}
          to={{
            pathname: '/settings/default/general',
          }}
        >
          Settings
        </NavLink>
      </div>
      <SearchBar />
      <UserSelector />
    </div>
  )
}
