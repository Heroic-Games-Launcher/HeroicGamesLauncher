import { InstallPlatform, WineInstallation } from 'common/types'
import { ParsedProtonShorctut } from 'common/types/proton_shorctuts'
import {
  CachedImage,
  PathSelectionBox,
  TextInputField,
  ToggleSwitch
} from 'frontend/components/UI'
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
  platformToInstall: InstallPlatform
  setSelectedExe: (val: string) => void
  selectedExe: string
  fileFilters: (installPlatform: InstallPlatform) => Electron.FileFilter[]
}

export default function FinishStep({
  winePrefix,
  wineVersion,
  appPlatform,
  gameUrl,
  customUserAgent,
  launchFullScreen,
  platformToInstall,
  selectedExe,
  setSelectedExe,
  setGameUrl,
  setCustomUserAgent,
  setLaunchFullScreen,
  fileFilters
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
    if (window.platform !== 'linux' || wineVersion?.type !== 'proton') return
    const shortcuts = await window.api.getProtonShortcuts(winePrefix)
    setProtonShortcuts(shortcuts)
  }

  useEffect(() => {
    loadProtonShortcuts()
  }, [])

  return (
    <div className="sideloadFinish">
      {showSideloadExe && (
        <>
          <div className="proton-shortcuts">
            {protonShortcuts.map((shortcut) => (
              <div
                key={shortcut.name}
                onClick={() => setSelectedExe(shortcut.executable)}
              >
                {shortcut.icon && (
                  <CachedImage src={`file://${shortcut.icon}`} />
                )}
                {shortcut.name}
              </div>
            ))}
          </div>

          <PathSelectionBox
            type="file"
            onPathChange={setSelectedExe}
            path={selectedExe}
            placeholder={t('sideload.info.exe', 'Select Executable')}
            pathDialogTitle={t('box.sideload.exe', 'Select Executable')}
            pathDialogDefaultPath={winePrefix}
            pathDialogFilters={fileFilters(platformToInstall)}
            htmlId="sideload-exe"
            label={t('sideload.info.exe', 'Select Executable')}
            noDeleteButton
          />
        </>
      )}
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
