import './index.css'

import { WineVersionInfo } from 'src/types'

import React, { lazy, useContext, useEffect } from 'react'
import ContextProvider from 'src/state/ContextProvider'
import { useTranslation } from 'react-i18next'
import { UpdateComponent } from 'src/components/UI'

const ToolCard = lazy(() => import('src/screens/Tools/components/ToolCard'))

export default function Tools(): JSX.Element | null {
  const { t } = useTranslation()
  const { wineVersions, refreshWineVersionInfo, refreshing } =
    useContext(ContextProvider)

  useEffect(() => {
    return refreshWineVersionInfo(true)
  }, [])

  if (refreshing) {
    return <UpdateComponent />
  }

  return (
    <>
      <h2>{t('winemanager.title', 'Wine Manager (Beta)')}</h2>
      {wineVersions?.length ? (
        <div className="Tools">
          <div
            style={
              !wineVersions.length ? { backgroundColor: 'transparent' } : {}
            }
            className="gameListLayout"
          >
            {!!wineVersions.length &&
              wineVersions.map((release: WineVersionInfo, key) => (
                <ToolCard key={key} {...release} />
              ))}
          </div>
        </div>
      ) : (
        <h3>
          {t(
            'winemanager.not-found',
            'Could not fetch Wine/Proton versions this time.'
          )}
        </h3>
      )}
    </>
  )
}
