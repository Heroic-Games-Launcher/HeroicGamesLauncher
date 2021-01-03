import React, { Dispatch, SetStateAction } from 'react'
import { NavLink } from 'react-router-dom'
import SearchBar from './UI/SearchBar'
import UserSelector from './UI/UserSelector'

interface Props {
  handleSearch: (input: string) => void
  user: string;
  handleRefresh: Dispatch<SetStateAction<boolean>>;
}

export default function NavBar({handleSearch, user, handleRefresh}: Props) {
  return (
    <div className="NavBar">
      <div className="Links">
        <NavLink activeStyle={{ color: '#FFA800', fontWeight: 500 }} exact to='/'>Library</NavLink>
        <NavLink activeStyle={{ color: '#FFA800', fontWeight: 500 }} strict to='/installed'>Installed</NavLink>
        <NavLink activeStyle={{ color: '#FFA800', fontWeight: 500 }} strict to='/settings'>Settings</NavLink>
      </div>
      <SearchBar handleSearch={handleSearch} />
      <UserSelector user={user} handleRefresh={handleRefresh} />
    </div>
  )
}
