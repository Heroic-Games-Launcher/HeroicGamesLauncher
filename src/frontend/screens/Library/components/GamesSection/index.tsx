import './index.css'
import { observer } from 'mobx-react'
import GamesList from '../GamesList'
import React from 'react'
import { Pagination } from '../../../../hooks/types'
import LibraryListControler from '../../../../state/new/LibraryListController'
import { Game } from '../../../../state/new/Game'
import useInfiniteScroll from 'react-infinite-scroll-hook'
import ActionIcons from '../GamesSectionActionIcons'

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
      <h5 className="libraryHeader">
        <div className="libraryHeaderWrapper">
          <span className="libraryTitle">
            {title}
            <span className="numberOfgames">{pagination.totalCount}</span>
          </span>
          <ActionIcons
            sortBox={sort}
            layoutBox={listController.layout}
            refresh={pagination.refresh}
            refreshing={pagination.refreshing}
            showHiddenBox={listController.showHidden}
          />
        </div>
      </h5>

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
