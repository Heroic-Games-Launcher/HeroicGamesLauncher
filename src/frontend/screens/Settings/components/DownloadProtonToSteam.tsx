import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'
import { hasHelp } from 'frontend/hooks/hasHelp'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'

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

  const helpContent = t(
    'help.download_proton_to_steam.info',
    'When enabled, Proton-GE will be downloaded directly to the Steam compatibility tools directory if it exists, instead of the default Heroic tools path.'
  )

  hasHelp(
    'downloadProtonToSteam',
    t(
      'setting.download-proton-to-steam',
      'Download Proton-GE to Steam directory'
    ),
    <p>{helpContent}</p>
  )

  return (
    <div className="toggleRow">
      <ToggleSwitch
        title={t(
          'setting.download-proton-to-steam',
          'Download Proton-GE to Steam directory'
        )}
        htmlId="download-proton-to-steam"
        handleChange={() => setDownloadProtonToSteam(!downloadProtonToSteam)}
        value={downloadProtonToSteam}
        description={helpContent}
      />
      <FontAwesomeIcon
        className="helpIcon"
        icon={faCircleInfo}
        title={t(
          'help.download_proton_to_steam',
          "When enabled, Proton-GE will be downloaded directly to the Steam compatibility tools directory instead of the default Heroic path. It will use the Steam path set in the 'Default Steam path' setting above."
        )}
      />
    </div>
  )
}

export default DownloadProtonToSteam
