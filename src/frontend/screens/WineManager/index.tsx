import './index.scss'

import ContextProvider from 'frontend/state/ContextProvider'
import { UpdateComponent } from 'frontend/components/UI'

import React, { lazy, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tab, Tabs } from '@mui/material'
import {
  StoreIpc,
  wineDownloaderInfoStore
} from 'frontend/helpers/electronStores'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons'
import { WineVersionInfo, Type } from 'common/types'

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
  const { refreshWineVersionInfo, refreshing } = useContext(ContextProvider)
  const winege: Type = 'Wine-GE'
  const protonge: Type = 'Proton-GE'
  const [repository, setRepository] = useState<Type>(winege)
  const [wineManagerSettings, setWineManagerSettings] =
    useState<WineManagerUISettings>({
      showWineGe: true,
      showWineLutris: true,
      showProtonGe: true
    })

  const getWineVersions = (repo: Type) => {
    const versions = wineDownloaderInfoStore.get(
      'wine-releases',
      []
    ) as WineVersionInfo[]
    return versions.filter((version) => version.type === repo)
  }

  const [wineVersions, setWineVersions] = useState<WineVersionInfo[]>(
    getWineVersions(repository)
  )

  const handleChangeTab = (e: React.SyntheticEvent, repo: Type) => {
    setRepository(repo)
    setWineVersions(getWineVersions(repo))
  }

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
  }, [])

  useEffect(() => {
    const removeListener = window.api.handleWineVersionsUpdated(() => {
      setWineVersions(getWineVersions(repository))
    })
    return () => {
      removeListener()
    }
  }, [repository])

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
              <Tab value={winege} label={winege} />
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
              wineVersions.map((release) => {
                return <WineItem key={release.version} {...release} />
              })}
          </div>
        ) : (
          <h5 className="wineList">
            {t(
              'wine.manager.not-found',
              'No Wine versions found. Please click the refresh icon to try again.'
            )}
          </h5>
        )}
      </div>
    </>
  )
})
