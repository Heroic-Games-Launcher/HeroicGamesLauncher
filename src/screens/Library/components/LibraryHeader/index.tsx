import React, { useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import ActionIcons from 'src/components/UI/ActionIcons'
import ContextProvider from 'src/state/ContextProvider'
import { GameInfo } from 'src/types'
import { getLibraryTitle } from '../../constants'
import FormControl from 'src/components/UI/FormControl'
import './index.css'

import classNames from 'classnames'

const storage = window.localStorage

type Props = {
  list: GameInfo[]
  sortDescending: boolean
  sortInstalled: boolean
  setSortInstalled: (value: boolean) => void
  setSortDescending: (value: boolean) => void
}

export default function LibraryHeader({
  list,
  sortInstalled,
  sortDescending,
  setSortDescending,
  setSortInstalled
}: Props) {
  const { t } = useTranslation()
  const { category, filter, handleCategory } = useContext(ContextProvider)

  const numberOfGames = useMemo(() => {
    if (!list) {
      return null
    }
    const dlcCount =
      category === 'legendary'
        ? list.filter((lib) => lib.install.is_dlc).length
        : 0

    const total = list.length - dlcCount
    return total > 0 ? `(${total})` : null
  }, [list, category])

  function handleSortDescending() {
    setSortDescending(!sortDescending)
    storage.setItem('sortDescending', JSON.stringify(!sortDescending))
  }

  function handleSortInstalled() {
    setSortInstalled(!sortInstalled)
    storage.setItem('sortInstalled', JSON.stringify(!sortInstalled))
  }

  return (
    <h3 className="libraryHeader">
      <div className="titleWithIcons">
        <span className="libraryTitle">
          {`${getLibraryTitle(category, filter, t)}`}
          <span className="numberOfgames">{numberOfGames}</span>
        </span>
        <ActionIcons
          sortDescending={sortDescending}
          toggleSortDescending={() => handleSortDescending()}
          sortInstalled={sortInstalled}
          library={category === 'legendary' ? 'legendary' : 'gog'}
          toggleSortinstalled={() => handleSortInstalled()}
        />
        <div className="storeFilter">
          <FormControl segmented small>
            <button
              onClick={() => handleCategory('all')}
              className={classNames('FormControl__button', {
                active: category === 'all'
              })}
              title={`${t('header.platform')}: ${t('All')}`}
            >
              {t('All').toUpperCase()}
            </button>
            <button
              className={classNames('FormControl__button', {
                active: category === 'legendary'
              })}
              onClick={() => handleCategory('legendary')}
            >
              EPIC
            </button>
            <button
              className={classNames('FormControl__button', {
                active: category === 'gog'
              })}
              onClick={() => handleCategory('gog')}
            >
              GOG
            </button>
          </FormControl>
        </div>
      </div>
    </h3>
  )
}
