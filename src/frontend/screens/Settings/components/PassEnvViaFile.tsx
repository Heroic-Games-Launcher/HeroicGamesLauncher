import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'
import InfoIcon from 'frontend/components/UI/InfoIcon'

const PassEnvViaFile = () => {
  const { t } = useTranslation()
  const { isDefault } = useContext(SettingsContext)

  const [passEnvViaFile, setPassEnvViaFile] = useSetting(
    'passEnvViaFile',
    false
  )

  if (isDefault) {
    return <></>
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="passEnvViaFile"
        value={passEnvViaFile}
        handleChange={() => setPassEnvViaFile(!passEnvViaFile)}
        title={t(
          'setting.passEnvViaFile',
          'OS Max Argument Workaround (may fix issues with scripts not running)'
        )}
      />
      <InfoIcon
        text={t(
          'help.envfile',
          'The environment variable HEROIC_METADATA_FILE is set to the path to a file containing metadata about the game, and no other environment variables are set.'
        )}
      />
    </div>
  )
}

export default PassEnvViaFile
