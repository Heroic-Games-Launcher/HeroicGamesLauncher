import { GameInfo } from 'common/types'
import { SteamInstallInfo } from 'common/types/steam'
import { UpdateComponent } from 'frontend/components/UI'
import { ModalContent, ModalFooter } from 'frontend/components/UI/Modal'
import Button from 'frontend/components/UI/Button'
import { getInstallInfo } from 'frontend/helpers'
import GameLanguageSelector from 'frontend/screens/Library/components/InstallModal/DownloadDialog/GameLanguageSelector'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface SteamModifyInstallModalProps {
  gameInfo: GameInfo
  onClose: () => void
}

export default function SteamModifyInstallModal({
  gameInfo,
  onClose
}: SteamModifyInstallModalProps) {
  const { t } = useTranslation('gamepage')
  const { t: tr } = useTranslation()
  const platform = gameInfo.install.platform ?? 'Windows'
  const [installInfo, setInstallInfo] = useState<SteamInstallInfo | null>()
  const [language, setLanguage] = useState('')

  useEffect(() => {
    let cancelled = false
    void getInstallInfo(gameInfo.app_name, 'steam', platform).then((info) => {
      if (cancelled) return
      const steamInfo = info as SteamInstallInfo | null
      setInstallInfo(steamInfo)
      const manifest = steamInfo?.manifest
      setLanguage(
        manifest?.installed_language ?? manifest?.default_language ?? ''
      )
    })
    return () => {
      cancelled = true
    }
  }, [gameInfo.app_name, platform])

  if (installInfo === undefined) {
    return (
      <ModalContent>
        <UpdateComponent />
      </ModalContent>
    )
  }

  const manifest = installInfo?.manifest
  const languages = manifest?.languages ?? []
  // One language leaves nothing to switch
  const unchanged =
    languages.length < 2 ||
    !language ||
    language === manifest?.installed_language

  const handleConfirm = () => {
    // Runs set-language through the queue
    void window.api.updateGame({
      gameInfo,
      appName: gameInfo.app_name,
      runner: gameInfo.runner,
      installLanguage: language
    })
    onClose()
  }

  return (
    <>
      <ModalContent>
        <div className="ModifyInstall__languages">
          {languages.length > 1 ? (
            <GameLanguageSelector
              installLanguages={languages}
              installLanguage={language}
              setInstallLanguage={setLanguage}
              installPlatform={platform}
              languageLocales={manifest?.language_locales}
            />
          ) : (
            <p className="ModifyInstall__hint">
              {languages.length === 1
                ? t(
                    'modifyInstall.steam.oneLanguage',
                    'This game is only available in one language.'
                  )
                : installInfo
                  ? t(
                      'modifyInstall.steam.noLanguages',
                      'Changing the language of a Steam game needs a newer Aurelia.'
                    )
                  : t(
                      'modifyInstall.steam.noInfo',
                      'Aurelia could not list the languages of this game. Check that you are logged in to Steam.'
                    )}
            </p>
          )}
        </div>
      </ModalContent>
      <ModalFooter>
        <Button onClick={handleConfirm} disabled={unchanged}>
          {tr('box.apply', 'Apply')}
        </Button>
      </ModalFooter>
    </>
  )
}
