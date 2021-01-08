import React from 'react'
import { NavLink } from 'react-router-dom'
import SearchBar from './UI/SearchBar'
import UserSelector from './UI/UserSelector'

export default function NavBar() {
  return (
    <div className="NavBar">
      <div className="Links">
        <NavLink activeStyle={{ color: '#FFA800', fontWeight: 500 }} exact to='/'>Library</NavLink>
        <NavLink activeStyle={{ color: '#FFA800', fontWeight: 500 }} to={{  
            pathname: '/settings/default'
          }}>Settings</NavLink>
      </div>
      <SearchBar />
      <UserSelector />
    </div>
  )
}
