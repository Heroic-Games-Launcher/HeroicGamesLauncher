import React from 'react'
import LibrarySearchBar from '../LibrarySearchBar'
import LibraryFilters from '../LibraryFilters'
import './index.css'

export default function Header() {
  return (
    <>
      <div className="Header">
        <div className="Header__search">
          <LibrarySearchBar />
        </div>
        <span className="Header__filters">
          <LibraryFilters />
        </span>
      </div>
    </>
  )
}
