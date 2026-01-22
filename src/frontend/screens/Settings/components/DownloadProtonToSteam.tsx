import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'
import InfoIcon from 'frontend/components/UI/InfoIcon'

const DownloadProtonToSteam = () => {
  const { t } = useTranslation()
  const { isDefault } = useContext(SettingsContext)
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'
  const [downloadProtonToSteam, setDownloadProtonToSteam] = useSetting(
    'downloadProtonToSteam',
    false
  )

  if (!isDefault || !isLinux) {
    return <></>
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        title={t(
          'setting.download-proton-steam',
          'Download GE-Proton to Steam directory'
        )}
        htmlId="download-proton-to-steam"
        handleChange={() => setDownloadProtonToSteam(!downloadProtonToSteam)}
        value={downloadProtonToSteam}
      />
      <InfoIcon
        text={t(
          'help.download_proton_steam',
          "When enabled, GE-Proton will be downloaded directly to the Steam compatibility tools directory instead of the default Heroic path. It will use the Steam path set in the 'Default Steam path' setting above."
        )}
      />
    </div>
  )
}

export default DownloadProtonToSteam
