import { faFolderOpen } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { TextInputWithIconField, SelectField } from 'frontend/components/UI'
import React from 'react'
import { Runner, WineInstallation } from 'common/types'
import { useTranslation } from 'react-i18next'
import { getGameInfo } from 'frontend/helpers'

type Props = {
  setWineVersion: React.Dispatch<
    React.SetStateAction<WineInstallation | undefined>
  >
  setWinePrefix: React.Dispatch<React.SetStateAction<string>>
  winePrefix: string
  wineVersionList: WineInstallation[]
  wineVersion: WineInstallation | undefined
  appName: string
  runner: Runner
}

export default function WineSelector({
  setWinePrefix,
  setWineVersion,
  winePrefix,
  wineVersionList,
  wineVersion,
  appName,
  runner
}: Props) {
  const { t } = useTranslation('gamepage')

  React.useEffect(() => {
    const getInfo = async () => {
      const gameData =
        runner === 'sideload'
          ? { folder_name: 'sideload' }
          : await getGameInfo(appName, runner)
      const bottleName = gameData?.folder_name
      const { defaultWinePrefix, wineVersion } =
        await window.api.requestAppSettings()
      const sugestedWinePrefix = `${defaultWinePrefix}/${bottleName}`
      setWinePrefix(sugestedWinePrefix)
      setWineVersion(wineVersion || undefined)
    }
    getInfo()
  }, [])

  return (
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
            wineVersionList.find((version) => version.bin === e.target.value)
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
  )
}
