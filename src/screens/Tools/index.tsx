import './index.css'

import { WineVersionInfo } from 'src/types'

import React, { lazy, useContext } from 'react'
import ContextProvider from 'src/state/ContextProvider'
import { useTranslation } from 'react-i18next'

const ToolCard = lazy(() => import('src/screens/Tools/components/ToolCard'))

export default function Tools(): JSX.Element | null {
  const { t } = useTranslation()
  const { wineVersions } = useContext(ContextProvider)

  if (!wineVersions?.length) {
    return null
  }

  return (
    <>
      <h2>{t('winemanager.title', 'Wine Manager')}</h2>
      <div className="Tools">
        <div
          style={!wineVersions.length ? { backgroundColor: 'transparent' } : {}}
          className="gameListLayout"
        >
          {!!wineVersions.length &&
            wineVersions.map((release: WineVersionInfo, key) => (
              <ToolCard key={key} {...release} />
            ))}
        </div>
      </div>
    </>
  )
}
