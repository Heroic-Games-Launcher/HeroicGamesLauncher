import React from 'react'
import StoreFilter from 'frontend/components/UI/StoreFilter'
import PlatformFilter from '../PlatformFilter'

import './index.css'
import LibrarySearchBar from '../LibrarySearchBar'

export default function Header() {
  return (
    <>
      <div className="Header">
        <div className="Header__search">
          <LibrarySearchBar />
        </div>
        <span className="Header__filters">
          <StoreFilter />
          <PlatformFilter />
        </span>
      </div>
    </>
  )
}
