import { observer } from 'mobx-react'
import GamesList from '../GamesList'
import React from 'react'
import { Pagination } from '../../../../hooks/types'
import LibraryHeader from '../LibraryHeader'
import LibraryListControler from '../../../../state/new/LibraryListController'
import { Game } from '../../../../state/new/Game'

const GamesSection: React.FC<{
  pagination: Pagination<Game>
  listController: LibraryListControler
  title: string
}> = ({ pagination, listController, title }) => {
  // load first 10 results, if has more button to see all is visible
  const { sort } = listController

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
      />
    </>
  )
}

export default observer(GamesSection)
