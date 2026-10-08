import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Ban,
  CircleAlert,
  CloudCog,
  Download,
  Pause,
  Play,
  ScrollText,
  Square,
  TriangleAlert,
  X
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import classNames from 'classnames'
import { GameInfo } from 'common/types'
import { openInstallGameModal } from 'frontend/state/InstallGameModal'
import { Button, Icon } from 'frontend/components/UI'
import type { ButtonVariant } from 'frontend/components/UI/Button'
import useSetting from 'frontend/hooks/useSetting'
import GameContext from '../../GameContext'

interface Props {
  gameInfo: GameInfo
  handlePlay: (gameInfo: GameInfo) => Promise<void>
  handleInstall: (
    is_installed: boolean
  ) => Promise<void | { status: 'done' | 'error' | 'abort' }>
}

interface ButtonContent {
  glyph: LucideIcon | null
  label: string
  variant: ButtonVariant
  legacyClass: string
}

const MainButton = ({ gameInfo, handlePlay, handleInstall }: Props) => {
  const { t } = useTranslation('gamepage')
  const { is } = useContext(GameContext)
  const [verboseLogs, setVerboseLogs] = useSetting('verboseLogs', true)
  const is_installed = gameInfo.is_installed
  const disabledPlayButtons =
    is.reparing ||
    is.moving ||
    is.updating ||
    is.uninstalling ||
    is.syncing ||
    is.launching ||
    is.installingWinetricksPackages ||
    is.installingRedist

  const disabledInstallButtons =
    is.playing ||
    is.updating ||
    is.reparing ||
    is.moving ||
    is.uninstalling ||
    is.notSupportedGame ||
    is.notInstallable ||
    is.importing

  function getPlayContent(): ButtonContent {
    if (is.syncing) {
      return {
        glyph: CloudCog,
        label: t('label.saves.syncing'),
        variant: 'ghost',
        legacyClass: 'playIcon'
      }
    }
    if (is.installingRedist) {
      return {
        glyph: null,
        label: t('label.redist', 'Installing Redistributables'),
        variant: 'ghost',
        legacyClass: 'playIcon'
      }
    }
    if (is.installingWinetricksPackages) {
      return {
        glyph: null,
        label: t('label.winetricks', 'Installing Winetricks Packages'),
        variant: 'ghost',
        legacyClass: 'playIcon'
      }
    }
    if (is.launching) {
      return {
        glyph: null,
        label: t('label.launching', 'Launching'),
        variant: 'ghost',
        legacyClass: 'playIcon'
      }
    }
    if (is.playing) {
      return {
        glyph: Square,
        label: t('label.playing.stop'),
        variant: 'danger',
        legacyClass: 'cancelIcon'
      }
    }
    if (is.notAvailable) {
      return {
        glyph: Ban,
        label: t('status.gameNotAvailable', 'Game not available'),
        variant: 'ghost',
        legacyClass: 'notAvailableIcon'
      }
    }
    return {
      glyph: Play,
      label: t('label.playing.start'),
      variant: 'primary',
      legacyClass: 'playIcon'
    }
  }

  function getInstallContent(): ButtonContent {
    if (is.notInstallable) {
      return {
        glyph: CircleAlert,
        label: t('status.goodie', 'Not installable'),
        variant: 'ghost',
        legacyClass: 'notAvailableIcon'
      }
    }
    if (is.notSupportedGame) {
      return {
        glyph: TriangleAlert,
        label: t('status.notSupported', 'Not supported'),
        variant: 'ghost',
        legacyClass: 'notAvailableIcon'
      }
    }
    if (is.queued) {
      return {
        glyph: X,
        label: t('button.queue.remove', 'Remove from Queue'),
        variant: 'danger',
        legacyClass: 'queueIcon'
      }
    }
    if (is.installing) {
      return {
        glyph: Pause,
        label: t('button.cancel'),
        variant: 'danger',
        legacyClass: 'cancelIcon'
      }
    }
    return {
      glyph: Download,
      label: t('button.install'),
      variant: 'primary',
      legacyClass: 'downIcon'
    }
  }

  const launch = async (withLogs: boolean) => {
    if (verboseLogs !== withLogs) {
      setVerboseLogs(withLogs)
    }
    await handlePlay(gameInfo)
  }

  function renderButton(
    { glyph, label, variant, legacyClass }: ButtonContent,
    props: React.ComponentProps<typeof Button>
  ) {
    return (
      <Button
        variant={variant}
        className={classNames('mainBtn', legacyClass)}
        icon={glyph ? <Icon glyph={glyph} size="xl" strokeWidth={2} /> : null}
        {...props}
      >
        {label}
      </Button>
    )
  }

  if (is_installed && !is.queued && !is.uninstalling) {
    return (
      <div className="playButtons">
        {renderButton(getPlayContent(), {
          disabled: disabledPlayButtons,
          autoFocus: true,
          onClick: async () => launch(false)
        })}
        {!disabledPlayButtons && !is.playing && (
          <Button
            variant="ghost"
            className="mainBtn playWithLogs"
            title={t(
              'label.playing.start_with_logs_hint',
              'Launches the game while recording a detailed log, useful when you need to report a problem'
            )}
            onClick={async () => launch(true)}
            icon={<Icon glyph={ScrollText} size="lg" strokeWidth={2} />}
          >
            {t('label.playing.start_with_logs', 'Play with Logs')}
          </Button>
        )}
      </div>
    )
  }

  if (!is_installed || is.queued) {
    return (
      <div className="installButtons">
        {renderButton(getInstallContent(), {
          disabled: disabledInstallButtons,
          autoFocus: true,
          onClick: async () => {
            if (!is_installed && !is.queued && !is.installing) {
              openInstallGameModal({
                appName: gameInfo.app_name,
                runner: gameInfo.runner,
                gameInfo,
                action: 'install'
              })
              return
            }
            handleInstall(is_installed)
          }
        })}
        <Button
          variant="ghost"
          className="mainBtn"
          disabled={disabledInstallButtons || is.installing || is.importing}
          onClick={() =>
            openInstallGameModal({
              appName: gameInfo.app_name,
              runner: gameInfo.runner,
              gameInfo,
              action: 'import'
            })
          }
        >
          {t('button.import', 'Import Game')}
        </Button>
      </div>
    )
  }

  return null
}

export default MainButton
