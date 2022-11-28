import './index.css'
import { observer } from 'mobx-react'
import GamesList from '../GamesList'
import React from 'react'
import LibraryListControler from '../../../../state/new/LibraryListController'
import useInfiniteScroll from 'react-infinite-scroll-hook'
import ActionIcons from '../GamesSectionActionIcons'

const GamesSection: React.FC<{
  listController: LibraryListControler
  title: string
  expanded?: boolean
  isRecent?: boolean
}> = ({ expanded, isRecent, listController, title }) => {
  const { sort, pagination } = listController

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
