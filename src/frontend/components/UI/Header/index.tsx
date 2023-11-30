import React from 'react'
import LibrarySearchBar from '../LibrarySearchBar'
import CategoryFilter from '../CategoryFilter'
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
          <CategoryFilter />
          <LibraryFilters />
        </span>
      </div>
    </>
  )
}
