import React from 'react'
import ActionIcons from 'frontend/components/UI/ActionIcons'
import './index.css'
import { useTranslation } from 'react-i18next'

const storage = window.localStorage

type Layout = 'grid' | 'list'

type Props = {
  title: string
  sortDescending: boolean
  sortInstalled: boolean
  setSortInstalled: (value: boolean) => void
  setSortDescending: (value: boolean) => void
  layout: Layout
  setLayout: (val: Layout) => void
  refresh: () => void
  refreshing: boolean
  showHidden: boolean
  totalCount: number
  count: number
  setShowHidden: (val: boolean) => void
  onSeeAllClick?: () => void
}

export default React.memo(function LibraryHeader({
  totalCount,
  count,
  onSeeAllClick,
  title,
  sortInstalled,
  sortDescending,
  setSortDescending,
  refresh,
  refreshing,
  setSortInstalled,
  layout,
  setLayout,
  showHidden,
  setShowHidden
}: Props) {
  const { t } = useTranslation()
  function handleSortDescending() {
    setSortDescending(!sortDescending)
    storage.setItem('sortDescending', JSON.stringify(!sortDescending))
  }

  function handleSortInstalled() {
    setSortInstalled(!sortInstalled)
    storage.setItem('sortInstalled', JSON.stringify(!sortInstalled))
  }

  return (
    <h5 className="libraryHeader">
      <div className="libraryHeaderWrapper">
        <span className="libraryTitle">
          {title}
          <span className="numberOfgames">{totalCount}</span>
          {count < totalCount && (
            <button className="sideloadGameButton" onClick={onSeeAllClick}>
              {t('see_all', 'See all')}
            </button>
          )}
        </span>
        <ActionIcons
          sortDescending={sortDescending}
          toggleSortDescending={() => handleSortDescending()}
          sortInstalled={sortInstalled}
          toggleSortinstalled={() => handleSortInstalled()}
          layout={layout}
          setLayout={setLayout}
          refresh={refresh}
          refreshing={refreshing}
          showHidden={showHidden}
          setShowHidden={setShowHidden}
        />
      </div>
    </h5>
  )
})
