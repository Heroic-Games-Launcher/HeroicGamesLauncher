import './index.css'

import ContextProvider from 'frontend/state/ContextProvider'
import { UpdateComponent } from 'frontend/components/UI'

import React, { lazy, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tab, Tabs } from '@mui/material'
import { Type } from 'heroic-wine-downloader'
import { StoreIpc } from 'frontend/helpers/electronStores'

const WineItem = lazy(
  async () => import('frontend/screens/WineManager/components/WineItem')
)

const configStore = new StoreIpc('wineManagerConfigStore', {
  cwd: 'store'
})

interface WineManagerUISettings {
  showWineGe: boolean
  showWineLutris: boolean
  showProtonGe: boolean
}

export default function WineManager(): JSX.Element | null {
  const { t } = useTranslation()
  const { wineVersions, refreshWineVersionInfo, refreshing } =
    useContext(ContextProvider)
  const winege: Type = 'Wine-GE'
  const winelutris: Type = 'Wine-Lutris'
  const protonge: Type = 'Proton-GE'
  const [repository, setRepository] = useState<Type>(winege)
  const [wineManagerSettings, setWineManagerSettings] =
    useState<WineManagerUISettings>({
      showWineGe: true,
      showWineLutris: true,
      showProtonGe: true
    })

  useEffect(() => {
    const hasSettings = configStore.has('wine-manager-settings')
    if (hasSettings) {
      const oldWineManagerSettings = configStore.get(
        'wine-manager-settings'
      ) as WineManagerUISettings
      if (wineManagerSettings) {
        setWineManagerSettings(oldWineManagerSettings)
      }
    }

    refreshWineVersionInfo(true)
  }, [])

  if (refreshing) {
    return <UpdateComponent />
  }

  const handleChangeTab = (e: React.SyntheticEvent, repo: Type) => {
    setRepository(repo)
  }

  return (
    <>
      <h2>{t('wine.manager.title', 'Wine Manager (Beta)')}</h2>
      {wineVersions?.length ? (
        <div className="wineManager">
          <Tabs
            className="tabs"
            value={repository}
            onChange={handleChangeTab}
            centered={true}
          >
            {wineManagerSettings.showWineGe && (
              <Tab className="tab" value={winege} label={winege} />
            )}
            {wineManagerSettings.showWineLutris && (
              <Tab value={winelutris} label={winelutris} />
            )}
            {wineManagerSettings.showProtonGe && (
              <Tab value={protonge} label={protonge} />
            )}
          </Tabs>
          <div
            style={
              !wineVersions.length ? { backgroundColor: 'transparent' } : {}
            }
            className="wineList"
          >
            <div className="gameListHeader">
              <span>{t('info.version', 'Wine Version')}</span>
              <span>{t('wine.release', 'Release Date')}</span>
              <span>{t('wine.size', 'Size')}</span>
              <span>{t('wine.actions', 'Action')}</span>
            </div>
            {!!wineVersions.length &&
              wineVersions.map((release, key) => {
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
