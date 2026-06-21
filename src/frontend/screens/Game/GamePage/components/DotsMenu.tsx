import { useContext, useState } from 'react'
import GameContext from '../../GameContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import GameSubMenu from '../../GameSubMenu'
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons'
import { GameInfo } from 'common/types'
import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import GameRequirements from '../../GameRequirements'
import { useTranslation } from 'react-i18next'
import GameChangeLog from '../../GameChangeLog'
import ModifyInstallModal from '../../ModifyInstallModal'
import type { GameHandle } from 'frontend/helpers/ipc'
interface Props {
  game: GameHandle
  gameInfo: GameInfo
  handleUpdate: () => void
}

const DotsMenu = ({ game, gameInfo, handleUpdate }: Props) => {
  const { t } = useTranslation('gamepage')
  const { gameExtraInfo, gameInstallInfo, is } = useContext(GameContext)
  const [showRequirements, setShowRequirements] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const [showModifyInstallModal, setShowModifyInstallModal] = useState(false)

  const { is_installed, title } = gameInfo

  return (
    <>
      <div className="game-actions">
        <button className="toggle">
          <FontAwesomeIcon icon={faEllipsisV} />
        </button>

        <GameSubMenu
          game={game}
          isInstalled={is_installed}
          title={title}
          storeUrl={
            gameExtraInfo?.storeUrl ||
            ('store_url' in gameInfo && gameInfo.store_url !== undefined
              ? gameInfo.store_url
              : '')
          }
          handleUpdate={handleUpdate}
          handleChangeLog={() => setShowChangelog(true)}
          disableUpdate={is.installing || is.updating}
          onShowRequirements={() => setShowRequirements(true)}
          onShowModifyInstall={() => setShowModifyInstallModal(true)}
          gameInfo={gameInfo}
        />
      </div>

      {showRequirements && (
        <Dialog showCloseButton onClose={() => setShowRequirements(false)}>
          <DialogHeader onClose={() => setShowRequirements(false)}>
            <div>{t('game.requirements', 'Requirements')}</div>
          </DialogHeader>
          <DialogContent>
            <GameRequirements game={game} />
          </DialogContent>
        </Dialog>
      )}

      {showModifyInstallModal && (
        <ModifyInstallModal
          game={game}
          gameInfo={gameInfo}
          gameInstallInfo={gameInstallInfo}
          onClose={() => setShowModifyInstallModal(false)}
        />
      )}

      {showChangelog && (
        <GameChangeLog
          game={game}
          title={gameInfo.overrides?.title || gameInfo.title}
          backdropClick={() => {
            setShowChangelog(false)
          }}
        />
      )}
    </>
  )
}

export default DotsMenu
