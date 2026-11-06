import './index.scss'
import { Modal, ModalContent, ModalHeader } from 'frontend/components/UI/Modal'
import { UpdateComponent } from 'frontend/components/UI'
import { GameInfo } from 'common/types'
import { LegendaryInstallInfo } from 'common/types/legendary'
import { GogInstallInfo } from 'common/types/gog'
import { NileInstallInfo } from 'common/types/nile'
import { ZoomInstallInfo, ZoomInstalledInfo } from 'common/types/zoom'
import { useTranslation } from 'react-i18next'
import LegendaryModifyInstallModal from './Legendary'
import GOGModifyInstallModal from './GOG'

interface ModifyInstallProps {
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
  gameInfo,
  gameInstallInfo,
  onClose
}: ModifyInstallProps) {
  const { t } = useTranslation()

  return (
    <Modal
      showCloseButton
      size="lg"
      onClose={() => onClose()}
      className={'ModifyInstall__dialog'}
    >
      <ModalHeader>{t('game.modify', 'Modify Installation')}</ModalHeader>
      {gameInstallInfo ? (
        <>
          {gameInfo.runner === 'gog' && (
            <GOGModifyInstallModal gameInfo={gameInfo} onClose={onClose} />
          )}
          {gameInfo.runner === 'legendary' && (
            <LegendaryModifyInstallModal
              dlcs={(gameInstallInfo as LegendaryInstallInfo)?.game.owned_dlc}
              gameInfo={gameInfo}
              onClose={onClose}
            />
          )}
        </>
      ) : (
        <ModalContent>
          <UpdateComponent />
        </ModalContent>
      )}
    </Modal>
  )
}
