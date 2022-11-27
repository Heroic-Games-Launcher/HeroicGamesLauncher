import React from 'react'
import { SearchBar } from 'frontend/components/UI'
import StoreFilter from 'frontend/components/UI/StoreFilter'
import PlatformFilter from '../../../../components/UI/PlatformFilter'
import { observer, Observer } from 'mobx-react'
import './index.css'
import useGlobalStore from '../../../../hooks/useGlobalStore'

const Header: React.FC = () => {
  const { libraryController } = useGlobalStore()

  return (
    <>
      <div className="Header">
        <div className="Header__search">
          <Observer>
            {() => (
              <SearchBar
                handleSearch={(val) => libraryController.search.set(val)}
                search={libraryController.search.get()}
              />
            )}
          </Observer>
        </div>
        <span className="Header__filters">
          <Observer>
            {() => (
              <StoreFilter
                onChange={(val) => libraryController.category.set(val)}
                value={libraryController.category.get()}
              />
            )}
          </Observer>
          <Observer>
            {() => (
              <PlatformFilter
                onChange={(val) => libraryController.platform.set(val)}
                value={libraryController.platform.get()}
                category={libraryController.category.get()}
              />
            )}
          </Observer>
        </span>
      </div>
    </>
  )
}

export default observer(Header)
