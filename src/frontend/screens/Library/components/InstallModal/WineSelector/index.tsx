import {
  SelectField,
  ToggleSwitch,
  TextInputField,
  PathSelectionBox
} from 'frontend/components/UI'
import React from 'react'
import { WineInstallation } from 'common/types'
import { useTranslation } from 'react-i18next'
import { removeSpecialcharacters } from 'frontend/helpers'

type Props = {
  setWineVersion: React.Dispatch<
    React.SetStateAction<WineInstallation | undefined>
  >
  setWinePrefix: React.Dispatch<React.SetStateAction<string>>
  setCrossoverBottle: React.Dispatch<React.SetStateAction<string>>
  setValidWinePrefix: React.Dispatch<React.SetStateAction<boolean>>
  winePrefix: string
  crossoverBottle: string
  wineVersionList: WineInstallation[]
  wineVersion: WineInstallation | undefined
  title?: string
  validWinePrefix: boolean
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
  setValidWinePrefix,
  validWinePrefix
}: Props) {
  const { t } = useTranslation('gamepage')

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
        const sugestedWinePrefix = `${prefixFolder}/${removeSpecialcharacters(
          title
        )}`
        setWinePrefix(sugestedWinePrefix)
        setWineVersion(wineVersion || undefined)
      }

      setValidWinePrefix(await window.api.checkWinePrefix(winePrefix))
    }
    getAppSettings()
  }, [useDefaultSettings])

  const showPrefix = wineVersion?.type !== 'crossover'
  const showBottle = wineVersion?.type === 'crossover'

  return (
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
      {!useDefaultSettings && (
        <>
          {showPrefix && (
            <PathSelectionBox
              type="directory"
              onPathChange={async (path) => {
                setWinePrefix(path)
                setValidWinePrefix(await window.api.checkWinePrefix(path))
              }}
              path={winePrefix}
              pathDialogTitle={t('box.wineprefix', 'Select WinePrefix Folder')}
              label={t('install.wineprefix', 'WinePrefix')}
              htmlId="setinstallpath"
              noDeleteButton
            />
          )}
          {!validWinePrefix && (
            <span className="error">
              {`${t(
                'install.flatpak-path-not-writtable',
                'Error: Sandbox access not granted to this path, data loss will occur.'
              )}`}
            </span>
          )}
          {showBottle && (
            <TextInputField
              label={t('setting.winecrossoverbottle', 'CrossOver Bottle')}
              htmlId="crossoverBottle"
              value={crossoverBottle}
              onChange={(event) => setCrossoverBottle(event.target.value)}
            />
          )}

          <SelectField
            label={`${t('install.wineversion')}:`}
            htmlId="wineVersion"
            value={wineVersion?.name || ''}
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
      )}
    </>
  )
}
