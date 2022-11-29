import './index.scss'

import ContextProvider from 'frontend/state/ContextProvider'
import { UpdateComponent } from 'frontend/components/UI'

import React, { lazy, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tab, Tabs } from '@mui/material'
import { Type } from 'heroic-wine-downloader'
import { StoreIpc } from 'frontend/helpers/electronStores'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons'

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

export default React.memo(function WineManager(): JSX.Element | null {
  const { t } = useTranslation()
  const { wineVersions, refreshWineVersionInfo, refreshing } =
    useContext(ContextProvider)
  const winege: Type = 'Wine-GE'
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
    const shouldFetch = Boolean(wineVersions.length > 0)
    refreshWineVersionInfo(shouldFetch)
  }, [])

  const handleChangeTab = (e: React.SyntheticEvent, repo: Type) => {
    setRepository(repo)
  }

  return (
    <>
      <h4 style={{ paddingTop: 'var(--space-md)' }}>
        {t('wine.manager.title', 'Wine Manager (Beta)')}
      </h4>
      <div className="wineManager">
        <span className="tabsWrapper">
          <Tabs
            className="tabs"
            value={repository}
            onChange={handleChangeTab}
            centered={true}
          >
            {wineManagerSettings.showWineGe && (
              <Tab className="tab" value={winege} label={winege} />
            )}
            {wineManagerSettings.showProtonGe && (
              <Tab value={protonge} label={protonge} />
            )}
          </Tabs>
          <button
            className={'FormControl__button'}
            title={t('generic.library.refresh', 'Refresh Library')}
            onClick={async () => refreshWineVersionInfo(true)}
          >
            <FontAwesomeIcon
              className={'FormControl__segmentedFaIcon'}
              icon={faSyncAlt}
            />
          </button>
        </span>
        {wineVersions.length ? (
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
            {refreshing && <UpdateComponent />}
            {!refreshing &&
              !!wineVersions.length &&
              wineVersions.map((release, key) => {
                if (release.type === repository) {
                  return <WineItem key={key} {...release} />
                }
                return
              })}
          </div>
        ) : (
          <h5 className="wineList">
            {t(
              'wine.manager.error',
              'Could not fetch Wine/Proton versions this time.'
            )}
          </h5>
        )}
      </div>
    </>
  )
})
