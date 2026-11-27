import {
  SelectField,
  ToggleSwitch,
  TextInputField,
  PathSelectionBox,
  Icon,
  Divider
} from 'frontend/components/UI'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { WineInstallation } from 'common/types'
import { Trans, useTranslation } from 'react-i18next'
import { removeSpecialcharacters } from 'frontend/helpers'
import { TriangleAlert } from 'lucide-react'
import { WineVersionListItem } from 'frontend/screens/Settings/components/WineVersionSelector'
import { MenuItem } from '@mui/material'
import { useAwaited } from 'frontend/hooks/useAwaited'
import { selectDefaultWineVersion } from './selectDefaultWineVersion'

type Props = {
  setWineVersion: (newVersion: WineInstallation) => void
  setWinePrefix: (newPrefix: string) => void
  setCrossoverBottle: React.Dispatch<React.SetStateAction<string>>
  winePrefix: string
  crossoverBottle: string
  wineVersionList: WineInstallation[]
  wineVersion: WineInstallation | undefined
  title?: string
  appName: string
  initiallyOpen?: boolean
  noDetails?: boolean
}

export default function WineSelector({
  setWinePrefix,
  setWineVersion,
  winePrefix,
  wineVersionList,
  wineVersion,
  title = 'sideload',
  crossoverBottle,
  setCrossoverBottle,
  initiallyOpen,
  appName,
  noDetails = false
}: Props) {
  const { t, i18n } = useTranslation('gamepage')

  const [useSharedPrefix, setUseSharedPrefix] = useState(false)
  const userPickedWineVersion = useRef(false)
  const defaultWineVersionApplied = useRef(false)

  const globalConfig = useAwaited(window.api.requestAppSettings)

  const sharedToggleDescription = useMemo(() => {
    if (!globalConfig) return ''
    return `${globalConfig.wineVersion.name}\n${globalConfig.defaultWinePrefix}`
  }, [globalConfig])

  useEffect(() => {
    if (!globalConfig) return

    if (useSharedPrefix) {
      setWinePrefix(globalConfig.winePrefix)
      setWineVersion(globalConfig.wineVersion)
      setCrossoverBottle(globalConfig.wineCrossoverBottle)
    } else {
      const suggestedPrefix = `${globalConfig.defaultWinePrefixDir}/${removeSpecialcharacters(title ?? appName)}`
      setWinePrefix(suggestedPrefix)
    }
  }, [
    globalConfig,
    useSharedPrefix,
    setWinePrefix,
    setWineVersion,
    setCrossoverBottle,
    title,
    appName
  ])

  useEffect(() => {
    // A late config load must not overwrite a manual pick.
    if (
      defaultWineVersionApplied.current ||
      userPickedWineVersion.current ||
      wineVersion ||
      !globalConfig
    ) {
      return
    }

    const defaultWineVersion = selectDefaultWineVersion(
      globalConfig.wineVersion,
      wineVersionList
    )

    if (!defaultWineVersion) return

    defaultWineVersionApplied.current = true
    setWineVersion(defaultWineVersion)
  }, [wineVersion, wineVersionList, globalConfig, setWineVersion])

  const showPrefix = wineVersion?.type !== 'crossover'
  const showBottle = wineVersion?.type === 'crossover'

  const mainContent = (
    <>
      <ToggleSwitch
        htmlId="use-shared-wine-config"
        title={t('setting.use-shared-wine-config', 'Use shared Wine prefix')}
        value={useSharedPrefix}
        handleChange={() => setUseSharedPrefix(!useSharedPrefix)}
        description={sharedToggleDescription}
      />
      {useSharedPrefix && (
        <div className="infoBox">
          <Icon glyph={TriangleAlert} size="sm" />
          <Trans
            i18n={i18n}
            i18nKey="setting.warn-use-shared-wine-config"
            ns="gamepage"
          >
            Only use this option if you know what you are doing.
            <br />
            Sharing the same prefix for multiple games can create problems if
            their dependencies are incompatible.
          </Trans>
        </div>
      )}
      {noDetails && <Divider className="sideloadWineDivider" />}
      {showPrefix && (
        <PathSelectionBox
          type="directory"
          onPathChange={setWinePrefix}
          path={winePrefix}
          pathDialogTitle={t('box.wineprefix', 'Select WinePrefix folder')}
          label={t('install.wineprefix', 'WinePrefix')}
          htmlId="setinstallpath"
          noDeleteButton
          disabled={useSharedPrefix}
        />
      )}
      {showBottle && (
        <TextInputField
          label={t('setting.winecrossoverbottle', 'CrossOver bottle')}
          htmlId="crossoverBottle"
          value={crossoverBottle}
          onChange={(newValue) => setCrossoverBottle(newValue)}
          disabled={useSharedPrefix}
        />
      )}

      <SelectField
        label={`${t('install.wineversion')}:`}
        htmlId="wineVersion"
        value={wineVersion?.name || ''}
        disabled={useSharedPrefix || wineVersionList.length === 0}
        onChange={(e) => {
          userPickedWineVersion.current = true
          setWineVersion(
            wineVersionList.find((version) => version.name === e.target.value)!
          )
        }}
      >
        {wineVersionList &&
          wineVersionList.map((version, i) => (
            <MenuItem key={i} value={version.name}>
              <WineVersionListItem version={version} />
            </MenuItem>
          ))}
      </SelectField>
    </>
  )

  const [detailsOpen, setDetailsOpen] = useState(!!initiallyOpen)

  if (noDetails) return mainContent

  return (
    <>
      <details open={detailsOpen} onChange={() => setDetailsOpen(detailsOpen)}>
        <summary>
          {t('setting.show-wine-settings', 'Show Wine settings')}
        </summary>
        {mainContent}
      </details>
    </>
  )
}
