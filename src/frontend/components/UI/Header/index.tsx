import React from 'react'
import StoreFilter from 'frontend/components/UI/StoreFilter'
import PlatformFilter from '../PlatformFilter'

import './index.css'
import LibrarySearchBar from '../LibrarySearchBar'
import CategoryFilter from '../CategoryFilter'

export default function Header() {
  return (
    <>
      <div className="Header">
        <div className="Header__search">
          <LibrarySearchBar />
        </div>
        <div className="Header__category">
          <CategoryFilter />
        </div>
        <span className="Header__filters">
          <StoreFilter />
          <PlatformFilter />
        </span>
      </div>
    </>
  )
}
