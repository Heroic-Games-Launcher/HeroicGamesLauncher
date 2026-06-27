import './index.scss'
import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import { UpdateComponent } from 'frontend/components/UI'
import { GameInfo } from 'common/types'
import { LegendaryInstallInfo } from 'common/types/legendary'
import { GogInstallInfo } from 'common/types/gog'
import { NileInstallInfo } from 'common/types/nile'
import { ZoomInstallInfo, ZoomInstalledInfo } from 'common/types/zoom'
import { useTranslation } from 'react-i18next'
import LegendaryModifyInstallModal from './Legendary'
import GOGModifyInstallModal from './GOG'
import type { GameHandle } from 'frontend/helpers/ipc'

interface ModifyInstallProps {
  game: GameHandle
  gameInfo: GameInfo
  gameInstallInfo:
    | LegendaryInstallInfo
    | GogInstallInfo
    | NileInstallInfo
    | ZoomInstalledInfo
    | ZoomInstallInfo
    | null
  onClose: () => void
}

export default function ModifyInstallModal({
  game,
  gameInfo,
  gameInstallInfo,
  onClose
}: ModifyInstallProps) {
  const { t } = useTranslation()

  return (
    <Dialog
      showCloseButton
      onClose={() => onClose()}
      className={'ModifyInstall__dialog'}
    >
      <DialogHeader onClose={() => onClose()}>
        <div>{t('game.modify', 'Modify Installation')}</div>
      </DialogHeader>
      <DialogContent>
        {gameInstallInfo ? (
          <>
            {gameInfo.runner === 'gog' && (
              <GOGModifyInstallModal
                game={game}
                gameInfo={gameInfo}
                onClose={onClose}
              />
            )}
            {gameInfo.runner === 'legendary' && (
              <LegendaryModifyInstallModal
                gameInstallInfo={gameInstallInfo as LegendaryInstallInfo}
                mainAppInfo={gameInfo}
                onClose={onClose}
              />
            )}
          </>
        ) : (
          <UpdateComponent />
        )}
      </DialogContent>
    </Dialog>
  )
}
