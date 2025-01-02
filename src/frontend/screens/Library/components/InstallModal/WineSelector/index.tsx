import {
  SelectField,
  ToggleSwitch,
  TextInputField,
  PathSelectionBox
} from 'frontend/components/UI'
import React from 'react'
import { WineInstallation } from 'common/types'
import { Trans, useTranslation } from 'react-i18next'
import { removeSpecialcharacters } from 'frontend/helpers'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWarning } from '@fortawesome/free-solid-svg-icons'

type Props = {
  setWineVersion: React.Dispatch<
    React.SetStateAction<WineInstallation | undefined>
  >
  setWinePrefix: React.Dispatch<React.SetStateAction<string>>
  setCrossoverBottle: React.Dispatch<React.SetStateAction<string>>
  winePrefix: string
  crossoverBottle: string
  wineVersionList: WineInstallation[]
  wineVersion: WineInstallation | undefined
  title?: string
  appName: string
  initiallyOpen?: boolean
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
  appName
}: Props) {
  const { t, i18n } = useTranslation('gamepage')

  const [detailsOpen, setDetailsOpen] = React.useState(!!initiallyOpen)
  const [useDefaultSettings, setUseDefaultSettings] = React.useState(false)
  const [description, setDescription] = React.useState('')

  React.useEffect(() => {
    const getAppSettings = async () => {
      const {
        defaultWinePrefix: prefixFolder,
        wineVersion,
        winePrefix: defaultPrefix,
        wineCrossoverBottle: defaultBottle
      } = await window.api.requestAppSettings()

      if (!wineVersion || !defaultPrefix || !defaultBottle) return
      setDescription(
        `${defaultPrefix} / ${wineVersion.name.replace('Proton - ', '')}`
      )

      if (!useDefaultSettings && wineVersion.type === 'crossover') {
        return setCrossoverBottle(defaultBottle)
      }

      if (useDefaultSettings) {
        setWinePrefix(defaultPrefix)
        setWineVersion(wineVersion)
        setCrossoverBottle(defaultBottle)
      } else {
        const dirName =
          removeSpecialcharacters(title) || removeSpecialcharacters(appName)
        const suggestedWinePrefix = `${prefixFolder}/${dirName}`
        setWinePrefix(suggestedWinePrefix)
        setWineVersion(wineVersion || undefined)
      }
    }
    getAppSettings()
  }, [useDefaultSettings])

  const showPrefix = wineVersion?.type !== 'crossover'
  const showBottle = wineVersion?.type === 'crossover'

  return (
    <>
      <details open={detailsOpen} onChange={() => setDetailsOpen(detailsOpen)}>
        <summary>
          {t('setting.show-wine-settings', 'Show Wine settings')}
        </summary>
        <>
          <ToggleSwitch
            htmlId="use-wine-defaults"
            title={t(
              'setting.use-default-wine-settings',
              'Use Default Wine Settings'
            )}
            value={useDefaultSettings}
            handleChange={() => setUseDefaultSettings(!useDefaultSettings)}
            description={description}
          />
          {useDefaultSettings && (
            <div className="infoBox">
              <FontAwesomeIcon icon={faWarning} />
              <Trans
                i18n={i18n}
                i18nKey="setting.warn-use-default-wine-settings"
                ns="gamepage"
              >
                Only use this option if you know what you are doing.
                <br />
                Sharing the same prefix for multiple games can create problems
                if their dependencies are incompatible.
              </Trans>
            </div>
          )}
          {showPrefix && (
            <PathSelectionBox
              type="directory"
              onPathChange={setWinePrefix}
              path={winePrefix}
              pathDialogTitle={t('box.wineprefix', 'Select WinePrefix Folder')}
              label={t('install.wineprefix', 'WinePrefix')}
              htmlId="setinstallpath"
              noDeleteButton
              disabled={useDefaultSettings}
            />
          )}
          {showBottle && (
            <TextInputField
              label={t('setting.winecrossoverbottle', 'CrossOver Bottle')}
              htmlId="crossoverBottle"
              value={crossoverBottle}
              onChange={(newValue) => setCrossoverBottle(newValue)}
              disabled={useDefaultSettings}
            />
          )}

          <SelectField
            label={`${t('install.wineversion')}:`}
            htmlId="wineVersion"
            value={wineVersion?.name || ''}
            disabled={useDefaultSettings}
            onChange={(e) =>
              setWineVersion(
                wineVersionList.find(
                  (version) => version.name === e.target.value
                )
              )
            }
          >
            {wineVersionList &&
              wineVersionList.map(({ name }, i) => (
                <option value={name} key={i}>
                  {name}
                </option>
              ))}
          </SelectField>
        </>
      </details>
    </>
  )
}
