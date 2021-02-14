import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import ContextProvider from '../../state/ContextProvider'

interface Props {
  renderBackButton: boolean
  numberOfGames?: number
  goTo: string
  handleFilter?: (value: string) => void
  handleLayout?: (value: string) => void
}

export default function Header({
  renderBackButton,
  numberOfGames,
  handleFilter,
  handleLayout,
  goTo,
}: Props) {
  const { t } = useTranslation()
  const { filter, libraryStatus, layout } = useContext(ContextProvider)
  const haveDownloads = libraryStatus.filter(
    (game) => game.status === 'installing' || game.status === 'updating'
  ).length

  return (
    <>
      <div className="header">
        {handleFilter && (
          <span className="selectFilter">
            <span>{t('Filter')}:</span>
            <span
              className={filter === 'all' ? 'selected' : ''}
              onClick={() => handleFilter('all')}
            >
              {t('All')}
            </span>
            <span
              className={filter === 'installed' ? 'selected' : ''}
              onClick={() => handleFilter('installed')}
            >
              {t('Ready')}
            </span>
            <span
              className={filter === 'uninstalled' ? 'selected' : ''}
              onClick={() => handleFilter('uninstalled')}
            >
              {t('Not Ready')}
            </span>
            <span
              className={filter === 'downloading' ? 'selected' : ''}
              onClick={() => handleFilter('downloading')}
            >
              {`${t('Downloading')} ${
                haveDownloads > 0 ? `(${haveDownloads})` : ''
              }`}
            </span>
          </span>
        )}
        {Boolean(numberOfGames) && (
          <span className="totalGamesText">
            {t('Total Games')}: {numberOfGames}
          </span>
        )}
        {handleLayout && (
          <div className="layoutSelection">
            <span className={layout === 'grid' ? 'selectedLayout material-icons' : 'material-icons'} onClick={() => handleLayout('grid')}>apps</span>
            <span className={layout === 'list' ? 'selectedLayout material-icons' : 'material-icons'} onClick={() => handleLayout('list')}>list</span>
          </div>
        )}
       
        {renderBackButton && (
          <div className="leftCluster">
            <Link className="returnLink" to={goTo}>
              <span className="material-icons">arrow_back</span>
              {t('Return')}
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
