import { observer } from 'mobx-react'
import GamesList from '../GamesList'
import React from 'react'
import { GameInfo } from '../../../../../common/types'
import { Pagination } from '../../../../hooks/types'
import LibraryHeader from '../LibraryHeader'
import LibraryListControler from '../../../../state/new/LibraryListController'

const GamesSection: React.FC<{
  pagination: Pagination<GameInfo>
  listController: LibraryListControler
  title: string
}> = ({ pagination, listController, title }) => {
  // load first 10 results, if has more button to see all is visible
  const { sort } = listController

  return (
    <>
      <LibraryHeader
        list={pagination.list}
        setSortDescending={() => sort.set('descending')}
        setSortInstalled={() => sort.set('installed')}
        sortDescending={sort.is('descending')}
        sortInstalled={sort.is('installed')}
        handleAddGameButtonClick={() => {
          // handleModal('', 'sideload', null)
        }}
        title={title}
      />
      <GamesList isFirstLane library={pagination.list} />
    </>
  )
}

export default observer(GamesSection)
