import React from 'react'
import { SearchBar } from 'frontend/components/UI'
import StoreFilter from 'frontend/components/UI/StoreFilter'
import PlatformFilter from '../../../../components/UI/PlatformFilter'
import { observer, Observer } from 'mobx-react'
import './index.css'
import useGlobalStore from '../../../../hooks/useGlobalStore'
import { useTranslation } from 'react-i18next'
import ActionIcons from '../GamesSectionActionIcons'

const Header: React.FC = () => {
  const { libraryController } = useGlobalStore()
  const { t } = useTranslation()
  const { listNameVisible, recentGames, favouritesLibrary, mainLibrary } =
    libraryController

  const tab = listNameVisible.get()

  const listControlers = {
    recent: recentGames,
    favourite: favouritesLibrary,
    all: mainLibrary
  }

  const listControler = listControlers[tab]

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
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          marginLeft: 'var(--space-md)',
          marginBottom: 'var(--space-md)'
        }}
      >
        <Tab
          label={t('Recent', 'Played Recently')}
          selected={tab === 'recent'}
          onSelect={() => listNameVisible.set('recent')}
          total={recentGames.pagination.totalCount}
        />
        <Tab
          label={t('favourites', 'Favourites')}
          selected={tab === 'favourite'}
          onSelect={() => listNameVisible.set('favourite')}
          total={favouritesLibrary.pagination.totalCount}
        />
        <Tab
          label={t('title.allGames', 'All Games')}
          selected={tab === 'all'}
          onSelect={() => listNameVisible.set('all')}
          total={mainLibrary.pagination.totalCount}
        />
        <div style={{ flex: 1 }} />
        <ActionIcons
          sortBox={listControler.sort}
          layoutBox={listControler.layout}
          refresh={listControler.pagination.refresh}
          refreshing={listControler.pagination.refreshing}
          showHiddenBox={listControler.showHidden}
        />
      </div>
    </>
  )
}

const Tab = ({
  label,
  selected,
  onSelect,
  total
}: {
  label: string
  selected: boolean
  total: number
  onSelect: () => void
}) => {
  return (
    <div
      onClick={onSelect}
      style={{
        color: selected ? 'var(--primary)' : 'white',
        padding: 10,
        borderBottom: selected ? '1px solid var(--primary)' : 'none',
        cursor: 'pointer'
      }}
    >
      <span>{label}</span>
      <span className="numberOfgames">{total}</span>
    </div>
  )
}

export default observer(Header)
