import { observer } from 'mobx-react'
import GamesList from '../GamesList'
import React from 'react'
import { Pagination } from '../../../../hooks/types'
import LibraryHeader from '../LibraryHeader'
import LibraryListControler from '../../../../state/new/LibraryListController'
import { Game } from '../../../../state/new/Game'
import useInfiniteScroll from 'react-infinite-scroll-hook'

const GamesSection: React.FC<{
  pagination: Pagination<Game>
  listController: LibraryListControler
  title: string
  expanded?: boolean
  isRecent?: boolean
}> = ({ expanded, isRecent, pagination, listController, title }) => {
  const { sort } = listController

  const [sentryRef] = useInfiniteScroll({
    loading: false,
    hasNextPage: pagination.hasMore,
    onLoadMore: () => pagination.loadMore()
  })

  return (
    <>
      <LibraryHeader
        totalCount={pagination.totalCount}
        count={pagination.list.length}
        setSortDescending={() => sort.set('descending')}
        setSortInstalled={() => sort.set('installed')}
        sortDescending={sort.is('descending')}
        sortInstalled={sort.is('installed')}
        layout={listController.layout.get()}
        setLayout={(val) => listController.layout.set(val)}
        title={title}
        refresh={pagination.refresh}
        refreshing={pagination.refreshing}
        setShowHidden={(val) => listController.showHidden.set(val)}
        showHidden={listController.showHidden.get()}
      />
      <GamesList
        isFirstLane
        library={pagination.list}
        layout={listController.layout.get()}
        isRecent={isRecent}
      />
      {expanded && (
        <div
          style={{ height: 100, width: 100, backgroundColor: 'transparent' }}
          ref={sentryRef}
        />
      )}
    </>
  )
}

export default observer(GamesSection)
