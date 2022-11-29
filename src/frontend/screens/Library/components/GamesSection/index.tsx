import './index.css'
import { observer } from 'mobx-react'
import GamesList from '../GamesList'
import React from 'react'
import LibraryListControler from '../../../../state/new/ui-controllers/LibraryListController'

const GamesSection: React.FC<{
  listController: LibraryListControler
  title: string
  isRecent?: boolean
}> = ({ isRecent, listController, title }) => {
  const { pagination } = listController

  return (
    <GamesList
      isFirstLane
      library={pagination.allResults}
      layout={listController.layout.get()}
      isRecent={isRecent}
      listName={title}
    />
  )
}

export default observer(GamesSection)
