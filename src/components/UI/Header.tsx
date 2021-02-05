import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import ContextProvider from '../../state/ContextProvider'

interface Props {
  renderBackButton: boolean
  numberOfGames?: number
  goTo: string
  handleFilter?: (value: string) => void
}

export default function Header({
  renderBackButton,
  numberOfGames,
  handleFilter,
  goTo,
}: Props) {
  const { t } = useTranslation()
  const { filter, libraryStatus } = useContext(ContextProvider)
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
