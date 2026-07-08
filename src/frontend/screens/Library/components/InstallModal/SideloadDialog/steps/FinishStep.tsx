import { WineInstallation } from 'common/types'
import { ParsedProtonShorctut } from 'common/types/proton_shorctuts'
import { TextInputField, ToggleSwitch } from 'frontend/components/UI'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  setGameUrl: (val: string) => void
  gameUrl: string
  appPlatform: string
  setCustomUserAgent: (val: string) => void
  customUserAgent: string
  setLaunchFullScreen: (val: boolean) => void
  launchFullScreen: boolean
  winePrefix: string
  wineVersion?: WineInstallation
}

export default function FinishStep({
  winePrefix,
  wineVersion,
  appPlatform,
  gameUrl,
  customUserAgent,
  launchFullScreen,
  setGameUrl,
  setCustomUserAgent,
  setLaunchFullScreen
}: Props) {
  const { t } = useTranslation('gamepage')

  const [protonShortcuts, setProtonShortcuts] = useState<
    ParsedProtonShorctut[]
  >([])

  const showSideloadExe = appPlatform !== 'Browser'
  function handleGameUrl(url: string) {
    if (!url.startsWith('https://')) {
      return setGameUrl(`https://${url}`)
    }

    setGameUrl(url)
  }

  async function loadProtonShortcuts() {
    if (wineVersion?.type !== 'proton') return
    const shortcuts = await window.api.getProtonShortcuts(winePrefix)
    setProtonShortcuts(shortcuts)
  }

  useEffect(() => {
    loadProtonShortcuts()
  }, [])

  return (
    <div className="sideloadFinish">
      {showSideloadExe && <></>}
      {!showSideloadExe && (
        <>
          <TextInputField
            label={t('sideload.info.broser', 'BrowserURL')}
            placeholder={t(
              'sideload.placeholder.url',
              'Paste the Game URL here'
            )}
            onChange={(newValue: string) => handleGameUrl(newValue)}
            htmlId="sideload-game-url"
            value={gameUrl}
          />
          <TextInputField
            label={t('sideload.info.useragent', 'Custom User Agent')}
            placeholder={t(
              'sideload.placeholder.useragent',
              'Write a custom user agent here to be used on this browser app/game'
            )}
            onChange={(newValue: string) => setCustomUserAgent(newValue)}
            htmlId="sideload-user-agent"
            value={customUserAgent}
          />
          <ToggleSwitch
            htmlId="launch-fullscreen"
            value={launchFullScreen}
            handleChange={() => setLaunchFullScreen(!launchFullScreen)}
            title={t(
              'sideload.info.fullscreen',
              'Launch Fullscreen (F11 to exit)'
            )}
          />
        </>
      )}
    </div>
  )
}
