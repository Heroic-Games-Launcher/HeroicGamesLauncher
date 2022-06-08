import React from 'react'
import { SearchBar } from 'src/components/UI'
import StoreFilter from 'src/components/UI/StoreFilter'
import PlatformFilter from '../PlatformFilter'

import './index.css'

export default function Header() {
  return (
    <>
      <div className="Header">
        <span className="Header__filters">
          <StoreFilter />
          <PlatformFilter />
        </span>
        <div className="Header__search">
          <SearchBar />
        </div>
      </div>
    </>
  )
}
