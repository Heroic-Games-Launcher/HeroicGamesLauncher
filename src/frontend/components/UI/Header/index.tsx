import React from 'react'
import LibrarySearchBar from '../LibrarySearchBar'
import CategoryFilter from '../CategoryFilter'
import LibraryFilters from '../LibraryFilters'
import './index.css'

const Header = React.forwardRef<HTMLDivElement, unknown>((_: unknown, ref) => {
  return (
    <>
      <div ref={ref} className="Header">
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
})

Header.displayName = 'Header'

export default Header
