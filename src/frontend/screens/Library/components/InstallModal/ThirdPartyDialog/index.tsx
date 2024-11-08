import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  GameInfo,
  InstallPlatform,
  Runner,
  WineInstallation
} from 'common/types'
import Anticheat from 'frontend/components/UI/Anticheat'
import {
  DialogFooter,
  DialogHeader,
  DialogContent
} from 'frontend/components/UI/Dialog'
import { install, writeConfig } from 'frontend/helpers'
import { hasAnticheatInfo } from 'frontend/hooks/hasAnticheatInfo'
import { InstallProgress } from 'frontend/types'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import AllowedIcon from 'frontend/assets/rounded_checkmark_icon.svg?react'
import { AvailablePlatforms } from '..'
import './index.css'

interface Props {
  backdropClick: () => void
  appName: string
  runner: Runner
  platformToInstall: InstallPlatform
  availablePlatforms: AvailablePlatforms
  winePrefix: string
  crossoverBottle: string
  wineVersion: WineInstallation | undefined
  children: React.ReactNode
  gameInfo: GameInfo
}

export default function ThirdPartyDialog({
  appName,
  runner,
  backdropClick,
  gameInfo,
  availablePlatforms,
  wineVersion,
  children,
  crossoverBottle,
  winePrefix,
  platformToInstall
}: Props) {
  const { t } = useTranslation('gamepage')
  const progress = {} as InstallProgress

  const anticheatInfo = hasAnticheatInfo(gameInfo)

  const handleInstall = useCallback(async () => {
    // Write Default game config with prefix on linux
    if (!isWindows) {
      const gameSettings = await window.api.requestGameSettings(appName)

      if (wineVersion) {
        writeConfig({
          appName,
          config: {
            ...gameSettings,
            winePrefix,
            wineVersion,
            wineCrossoverBottle: crossoverBottle
          }
        })
      }
    }

    backdropClick()

    return install({
      gameInfo,
      previousProgress: progress,
      progress,
      installPath: 'thirdParty',
      isInstalling: false,
      t,
      platformToInstall,
      showDialogModal: () => backdropClick()
    })
  }, [appName, t, winePrefix, wineVersion, crossoverBottle, platformToInstall])

  return (
    <>
      <DialogHeader onClose={backdropClick}>
        {gameInfo.title}
        {availablePlatforms.map((p) => (
          <FontAwesomeIcon
            className="InstallModal__platformIcon"
            icon={p.icon}
            key={p.value}
          />
        ))}
      </DialogHeader>
      <DialogContent>
        <div className="thirdPartyNotice">
          <div className="noticeIcon">
            <AllowedIcon />
          </div>
          <div className="noticeInfo">
            <h4>
              {t(
                'third-party-managed.header',
                'This game is managed by a third-party application'
              )}
            </h4>
            <p>
              {t(
                'third-party-managed.notice1',
                'This game is managed by a third-party application: "{{application_name}}"',
                {
                  application_name: gameInfo.isEAManaged
                    ? 'EA app'
                    : gameInfo.thirdPartyManagedApp
                }
              )}
            </p>
            <p>
              {t(
                'third-party-managed.notice2',
                'After clicking Install, Heroic will run the application in order to complete the installation process'
              )}
            </p>
          </div>
        </div>
        <Anticheat anticheatInfo={anticheatInfo} />
        {children}
      </DialogContent>
      <DialogFooter>
        <button
          className={`button is-secondary`}
          onClick={handleInstall}
          disabled={runner !== 'legendary'}
        >
          {t('button.install')}
        </button>
      </DialogFooter>
    </>
  )
}
