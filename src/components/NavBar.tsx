import React from 'react'
import { NavLink } from 'react-router-dom'
import SearchBar from './UI/SearchBar'
import UserSelector from './UI/UserSelector'

export default function NavBar() {


  return (
    <div className="navbar is-fixed-top">
      
      <div className="navbar-start">
        <div className="navbar-item">
          <NavLink activeClassName="has-text-primary" exact to='/'>Library</NavLink>
        </div>
        <div className="navbar-item">
        <NavLink activeClassName="has-text-primary" exact to='/settings/default'>Settings</NavLink>
        </div>
      </div>

      <div className="navbar-item field force-center">
        <SearchBar />
      </div>
      
      <div className="navbar-end">
        <div className="navbar-item has-dropdown is-hoverable is-right">
          <UserSelector />
        </div>
      </div>

    </div>
  )
}
