import './index.scss'

import ContextProvider from 'frontend/state/ContextProvider'
import { UpdateComponent } from 'frontend/components/UI'

import React, { lazy, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tab, Tabs } from '@mui/material'
import { StoreIpc } from 'frontend/helpers/electronStores'
import { Type } from 'common/types/toolmanager'

const ToolItem = lazy(
  async () => import('frontend/screens/ToolManager/components/ToolItem')
)

const configStore = new StoreIpc('wineManagerConfigStore', {
  cwd: 'store'
})

interface ToolManagerUISettings {
  showWineGe: boolean
  showProtonGe: boolean
  showSodaBottles: boolean
  showDXVK: boolean
  showDXVKAsync: boolean
  showDXVKNVAPI: boolean
  showVKD3D: boolean
}

export default function ToolManager(): JSX.Element | null {
  const { t } = useTranslation()
  const {
    toolVersions,
    refreshToolVersionInfo: refreshToolVersionInfo,
    refreshing
  } = useContext(ContextProvider)
  const winege: Type = 'Wine-GE'
  const protonge: Type = 'Proton-GE'
  const sodabottles: Type = 'Soda-Bottles'
  const dxvk: Type = 'DXVK'
  const dxvkasync: Type = 'DXVK-Async'
  const dxvknvapi: Type = 'DXVK-NVAPI'
  const vkd3d: Type = 'VKD3D'
  const [repository, setRepository] = useState<Type>(winege)
  const [toolManagerSettings, setToolManagerSettings] =
    useState<ToolManagerUISettings>({
      showWineGe: true,
      showProtonGe: true,
      showSodaBottles: true,
      showDXVK: true,
      showDXVKAsync: true,
      showDXVKNVAPI: true,
      showVKD3D: true
    })

  useEffect(() => {
    const hasSettings = configStore.has('wine-manager-settings')
    if (hasSettings) {
      const oldToolManagerSettings = configStore.get(
        'wine-manager-settings'
      ) as ToolManagerUISettings
      if (toolManagerSettings) {
        setToolManagerSettings(oldToolManagerSettings)
      }
    }

    const shouldFetch = Boolean(toolVersions.length > 0)
    refreshToolVersionInfo(shouldFetch)
  }, [])

  if (refreshing) {
    return <UpdateComponent />
  }

  const handleChangeTab = (e: React.SyntheticEvent, repo: Type) => {
    setRepository(repo)
  }

  return (
    <>
      <h2>{t('tool.manager.title', 'Tool Manager')}</h2>
      <div className="toolManager">
        <Tabs
          className="tabs"
          value={repository}
          onChange={handleChangeTab}
          centered={true}
        >
          {toolManagerSettings.showWineGe && (
            <Tab className="tab" value={winege} label={winege} />
          )}
          {toolManagerSettings.showProtonGe && (
            <Tab value={protonge} label={protonge} />
          )}
          {toolManagerSettings.showSodaBottles && (
            <Tab value={sodabottles} label={sodabottles} />
          )}
          {toolManagerSettings.showDXVK && <Tab value={dxvk} label={dxvk} />}
          {toolManagerSettings.showDXVKAsync && (
            <Tab value={dxvkasync} label={dxvkasync} />
          )}
          {toolManagerSettings.showDXVKNVAPI && (
            <Tab value={dxvknvapi} label={dxvknvapi} />
          )}
          {toolManagerSettings.showVKD3D && <Tab value={vkd3d} label={vkd3d} />}
        </Tabs>
        {toolVersions.length ? (
          <div
            style={
              !toolVersions.length ? { backgroundColor: 'transparent' } : {}
            }
            className="toolList"
          >
            <div className="gameListHeader">
              <span>{t('tool.version', 'Version')}</span>
              <span>{t('tool.release', 'Release Date')}</span>
              <span>{t('tool.size', 'Size')}</span>
              <span>{t('tool.actions', 'Action')}</span>
            </div>
            {!!toolVersions.length &&
              toolVersions.map((release, key) => {
                if (release.type === repository) {
                  return <ToolItem key={key} {...release} />
                }
                return
              })}
          </div>
        ) : (
          <h5 className="toolList">
            {t(
              'tool.manager.error',
              'Could not fetch Tool versions this time.'
            )}
          </h5>
        )}
      </div>
    </>
  )
}
