import React, { useContext } from 'react'
import { SearchBar } from 'src/components/UI'
import StoreFilter from 'src/components/UI/StoreFilter'
import ContextProvider from 'src/state/ContextProvider'
import PlatformFilter from '../PlatformFilter'

import './index.css'

export default function Header() {
  const { epic, gog } = useContext(ContextProvider)
  const showStoreFilter = epic.username && gog.username

  return (
    <>
      <div className="Header">
        <span className="Header__filters">
          {showStoreFilter && <StoreFilter />}
          <PlatformFilter />
        </span>
        <div className="Header__search">
          <SearchBar />
        </div>
      </div>
    </>
  )
}
