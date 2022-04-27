import './index.css'

import { WineVersionInfo } from 'src/types'

import React, { lazy, useContext, useEffect } from 'react'
import ContextProvider from 'src/state/ContextProvider'
import { useTranslation } from 'react-i18next'
import { UpdateComponent } from 'src/components/UI'

const WineItem = lazy(
  () => import('src/screens/WineManager/components/WineItem')
)

export default function WineManager(): JSX.Element | null {
  const { t } = useTranslation()
  const { wineVersions, refreshWineVersionInfo, refreshing } =
    useContext(ContextProvider)

  useEffect(() => {
    refreshWineVersionInfo(true)
  }, [])

  if (refreshing) {
    return <UpdateComponent />
  }

  return (
    <>
      <h2>{t('wine.manager.title', 'Wine Manager (Beta)')}</h2>
      {wineVersions?.length ? (
        <div className="WineManager">
          <div
            style={
              !wineVersions.length ? { backgroundColor: 'transparent' } : {}
            }
          >
            {!!wineVersions.length &&
              wineVersions.map((release: WineVersionInfo, key) => (
                <WineItem key={key} {...release} />
              ))}
          </div>
        </div>
      ) : (
        <h3>
          {t(
            'wine.manager.error',
            'Could not fetch Wine/Proton versions this time.'
          )}
        </h3>
      )}
    </>
  )
}
