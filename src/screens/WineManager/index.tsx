import './index.css'

import { WineVersionInfo } from 'src/types'

import React, { lazy, useContext, useEffect, useState } from 'react'
import ContextProvider from 'src/state/ContextProvider'
import { useTranslation } from 'react-i18next'
import { UpdateComponent } from 'src/components/UI'
import { Tab, Tabs } from '@mui/material'
import { Type } from 'heroic-wine-downloader'

const WineItem = lazy(
  () => import('src/screens/WineManager/components/WineItem')
)

export default function WineManager(): JSX.Element | null {
  const { t } = useTranslation()
  const { wineVersions, refreshWineVersionInfo, refreshing } =
    useContext(ContextProvider)
  const winege: Type = 'Wine-GE'
  const winelutris: Type = 'Wine-Lutris'
  const protonge: Type = 'Proton-GE'
  const [repository, setRepository] = useState<Type>(winege)

  useEffect(() => {
    return refreshWineVersionInfo(true)
  }, [])

  if (refreshing) {
    return <UpdateComponent />
  }

  const handleChange = (e: React.SyntheticEvent, repo: Type) => {
    setRepository(repo)
  }

  return (
    <>
      <h2>{t('wine.manager.title', 'Wine Manager (Beta)')}</h2>
      {wineVersions?.length ? (
        <div className="WineManager">
          <Tabs value={repository} onChange={handleChange} centered={true}>
            <Tab value={winege} label={winege} />
            <Tab value={winelutris} label={winelutris} />
            <Tab value={protonge} label={protonge} />
          </Tabs>
          <div
            style={
              !wineVersions.length ? { backgroundColor: 'transparent' } : {}
            }
            className="gameListLayout"
          >
            {!!wineVersions.length &&
              wineVersions.map((release: WineVersionInfo, key) => {
                if (release.type === repository) {
                  return <WineItem key={key} {...release} />
                }
                return
              })}
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
