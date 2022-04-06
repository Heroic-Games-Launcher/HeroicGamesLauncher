import './index.css'

import { WineVersionInfo } from 'src/types'
import ContextProvider from 'src/state/ContextProvider'
import { ToggleSwitch, UpdateComponent } from 'src/components/UI'

import React, { lazy, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Popper, Tab, Tabs } from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import { Type } from 'heroic-wine-downloader'
import classNames from 'classnames'
import ElectronStore from 'electron-store'
const Store = window.require('electron-store')

const WineItem = lazy(
  () => import('src/screens/WineManager/components/WineItem')
)

const configStore: ElectronStore = new Store({
  cwd: 'store'
})

interface WineManagerUISettings {
  showWineGe: boolean
  showWineLutris: boolean
  showProtonGe: boolean
}

export default function WineManager(): JSX.Element | null {
  const { t } = useTranslation()
  const { wineVersions, refreshWineVersionInfo, refreshing, isRTL } =
    useContext(ContextProvider)
  const winege: Type = 'Wine-GE'
  const winelutris: Type = 'Wine-Lutris'
  const protonge: Type = 'Proton-GE'
  const [repository, setRepository] = useState<Type>(winege)
  const [anchorEl, setAnchorEl] = useState<null | SVGSVGElement>(null)
  const [wineManagerSettings, setWineManagerSettings] =
    useState<WineManagerUISettings>({
      showWineGe: true,
      showWineLutris: true,
      showProtonGe: true
    })

  const openSettings = (event: React.MouseEvent<SVGSVGElement>) => {
    setAnchorEl(anchorEl ? null : event.currentTarget)
  }

  useEffect(() => {
    if (configStore.has('wine-manager-settings')) {
      const oldWineManagerSettings = configStore.get(
        'wine-manager-settings'
      ) as WineManagerUISettings
      if (wineManagerSettings) {
        setWineManagerSettings(oldWineManagerSettings)
      }
    }

    return refreshWineVersionInfo(true)
  }, [])

  if (refreshing) {
    return <UpdateComponent />
  }

  const handleChangeTab = (e: React.SyntheticEvent, repo: Type) => {
    setRepository(repo)
  }

  const handleChangeSettings = (settings: WineManagerUISettings) => {
    setWineManagerSettings(settings)
    configStore.set('wine-manager-settings', settings)
  }

  return (
    <>
      <h2>{t('wine.manager.title', 'Wine Manager (Beta)')}</h2>
      {wineVersions?.length ? (
        <div className="WineManager">
          <Tabs value={repository} onChange={handleChangeTab} centered={true}>
            {wineManagerSettings.showWineGe && (
              <Tab value={winege} label={winege} />
            )}
            {wineManagerSettings.showWineLutris && (
              <Tab value={winelutris} label={winelutris} />
            )}
            {wineManagerSettings.showProtonGe && (
              <Tab value={protonge} label={protonge} />
            )}
          </Tabs>
          <SettingsIcon onClick={openSettings} />
          <Popper open={Boolean(anchorEl)} anchorEl={anchorEl}>
            <Box sx={{ border: 1, p: 1, bgcolor: 'background.paper' }}>
              <label className={classNames('toggleWrapper', { isRTL: isRTL })}>
                <ToggleSwitch
                  value={wineManagerSettings.showWineGe}
                  handleChange={() =>
                    handleChangeSettings({
                      ...wineManagerSettings,
                      showWineGe: !wineManagerSettings.showWineGe
                    })
                  }
                  title={winege}
                />
                <span>{winege}</span>
              </label>
              <label className={classNames('toggleWrapper', { isRTL: isRTL })}>
                <ToggleSwitch
                  value={wineManagerSettings.showWineLutris}
                  handleChange={() =>
                    handleChangeSettings({
                      ...wineManagerSettings,
                      showWineLutris: !wineManagerSettings.showWineLutris
                    })
                  }
                  title={winelutris}
                />
                <span>{winelutris}</span>
              </label>
              <label className={classNames('toggleWrapper', { isRTL: isRTL })}>
                <ToggleSwitch
                  value={wineManagerSettings.showProtonGe}
                  handleChange={() =>
                    handleChangeSettings({
                      ...wineManagerSettings,
                      showProtonGe: !wineManagerSettings.showProtonGe
                    })
                  }
                  title={protonge}
                />
                <span>{protonge}</span>
              </label>
            </Box>
          </Popper>
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
