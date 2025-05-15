import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'
import { hasHelp } from 'frontend/hooks/hasHelp'

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
  )
}

export default DownloadProtonToSteam
