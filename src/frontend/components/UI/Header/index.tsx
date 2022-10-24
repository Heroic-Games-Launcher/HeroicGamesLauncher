import React from 'react'
import { SearchBar } from 'frontend/components/UI'
import StoreFilter from 'frontend/components/UI/StoreFilter'
import PlatformFilter from '../PlatformFilter'

import './index.css'

export default function Header() {
  return (
    <>
      <div className="Header">
        <div className="Header__search">
          <SearchBar />
        </div>
        <span className="Header__filters">
          <StoreFilter />
          <PlatformFilter />
        </span>
      </div>
    </>
  )
}
