import React, { useContext, useState } from 'react'
import GameContext from '../../GameContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { GameSubMenu } from '../..'
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons'
import { GameInfo } from 'common/types'
import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import GameRequirements from '../../GameRequirements'
import { useTranslation } from 'react-i18next'
import DLCList from 'frontend/components/UI/DLCList'
import { UpdateComponent } from 'frontend/components/UI'

interface Props {
  gameInfo: GameInfo
  handleUpdate: () => void
}

const DotsMenu = ({ gameInfo, handleUpdate }: Props) => {
  const { t } = useTranslation('gamepage')
  const { appName, gameExtraInfo, gameInstallInfo, runner, is } =
    useContext(GameContext)
  const [showRequirements, setShowRequirements] = useState(false)
  const [showDlcs, setShowDlcs] = useState(false)

  const { is_installed, title } = gameInfo

  const hasRequirements = (gameExtraInfo?.reqs || []).length > 0

  return (
    <>
      <div className="game-actions">
        <button className="toggle">
          <FontAwesomeIcon icon={faEllipsisV} />
        </button>

        <GameSubMenu
          appName={appName}
          isInstalled={is_installed}
          title={title}
          storeUrl={
            gameExtraInfo?.storeUrl ||
            ('store_url' in gameInfo && gameInfo.store_url !== undefined
              ? gameInfo.store_url
              : '')
          }
          runner={gameInfo.runner}
          handleUpdate={handleUpdate}
          disableUpdate={is.installing || is.updating}
          onShowRequirements={
            hasRequirements ? () => setShowRequirements(true) : undefined
          }
          onShowDlcs={() => setShowDlcs(true)}
        />
      </div>

      {showRequirements && (
        <Dialog showCloseButton onClose={() => setShowRequirements(false)}>
          <DialogHeader onClose={() => setShowRequirements(false)}>
            <div>{t('game.requirements', 'Requirements')}</div>
          </DialogHeader>
          <DialogContent>
            <GameRequirements reqs={gameExtraInfo?.reqs} />
          </DialogContent>
        </Dialog>
      )}

      {showDlcs && (
        <Dialog showCloseButton onClose={() => setShowDlcs(false)}>
          <DialogHeader onClose={() => setShowDlcs(false)}>
            <div>{t('game.dlcs', 'DLCs')}</div>
          </DialogHeader>
          <DialogContent>
            {gameInstallInfo ? (
              <DLCList
                dlcs={gameInstallInfo?.game.owned_dlc}
                runner={runner}
                mainAppInfo={gameInfo}
                onClose={() => setShowDlcs(false)}
              />
            ) : (
              <UpdateComponent inline />
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

export default DotsMenu
