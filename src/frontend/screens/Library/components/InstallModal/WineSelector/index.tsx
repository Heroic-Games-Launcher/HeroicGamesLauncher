import { faFolderOpen } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  TextInputWithIconField,
  SelectField,
  ToggleSwitch
} from 'frontend/components/UI'
import React from 'react'
import { AppSettings, WineInstallation } from 'common/types'
import { useTranslation } from 'react-i18next'
import { configStore } from 'frontend/helpers/electronStores'
import { removeSpecialcharacters } from 'frontend/helpers'

type Props = {
  setWineVersion: React.Dispatch<
    React.SetStateAction<WineInstallation | undefined>
  >
  setWinePrefix: React.Dispatch<React.SetStateAction<string>>
  winePrefix: string
  wineVersionList: WineInstallation[]
  wineVersion: WineInstallation | undefined
  title?: string
}

export default function WineSelector({
  setWinePrefix,
  setWineVersion,
  winePrefix,
  wineVersionList,
  wineVersion,
  title = 'sideload'
}: Props) {
  const { t } = useTranslation('gamepage')

  const [useDefaultSettings, setUseDefaultSettings] = React.useState(false)
  const [description, setDescription] = React.useState('')

  React.useEffect(() => {
    const {
      defaultWinePrefix: prefixFolder,
      wineVersion,
      winePrefix: defaultPrefix
    } = configStore.get('settings') as AppSettings
    setDescription(
      `${defaultPrefix} / ${wineVersion.name.replace('Proton - ', '')}`
    )

    if (useDefaultSettings) {
      setWinePrefix(defaultPrefix)
      setWineVersion(wineVersion)
    } else {
      const sugestedWinePrefix = `${prefixFolder}/${removeSpecialcharacters(
        title
      )}`
      setWinePrefix(sugestedWinePrefix)
      setWineVersion(wineVersion || undefined)
    }
  }, [useDefaultSettings])

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
          <TextInputWithIconField
            label={t('install.wineprefix', 'WinePrefix')}
            htmlId="setinstallpath"
            placeholder={winePrefix}
            value={winePrefix.replaceAll("'", '')}
            onChange={(event) => setWinePrefix(event.target.value)}
            icon={<FontAwesomeIcon icon={faFolderOpen} />}
            onIconClick={async () =>
              window.api
                .openDialog({
                  buttonLabel: t('box.choose'),
                  properties: ['openDirectory'],
                  title: t('box.wineprefix', 'Select WinePrefix Folder')
                })
                .then((path) => setWinePrefix(path || winePrefix))
            }
          />

          <SelectField
            label={`${t('install.wineversion')}:`}
            htmlId="wineVersion"
            value={wineVersion?.bin || ''}
            onChange={(e) =>
              setWineVersion(
                wineVersionList.find(
                  (version) => version.bin === e.target.value
                )
              )
            }
          >
            {wineVersionList &&
              wineVersionList.map((version) => (
                <option value={version.bin} key={version.bin}>
                  {version.name}
                </option>
              ))}
          </SelectField>
        </>
      )}
    </>
  )
}
