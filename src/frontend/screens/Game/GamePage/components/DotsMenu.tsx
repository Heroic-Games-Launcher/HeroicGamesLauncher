import { useContext, useEffect, useRef, useState } from 'react'
import GameContext from '../../GameContext'
import { EllipsisVertical } from 'lucide-react'
import GameSubMenu from '../../GameSubMenu'
import { Button, Icon, Tooltip } from 'frontend/components/UI'
import { GameInfo } from 'common/types'
import { Modal, ModalContent, ModalHeader } from 'frontend/components/UI/Modal'
import GameRequirements from '../../GameRequirements'
import { useTranslation } from 'react-i18next'
import GameChangeLog from '../../GameChangeLog'
import ModifyInstallModal from '../../ModifyInstallModal'
import GOGExtrasDialog from '../../GOGExtrasDialog'

interface Props {
  gameInfo: GameInfo
  handleUpdate: () => void
}

const DotsMenu = ({ gameInfo, handleUpdate }: Props) => {
  const { t } = useTranslation('gamepage')
  const { appName, gameExtraInfo, gameInstallInfo, is } =
    useContext(GameContext)
  const [showRequirements, setShowRequirements] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const [showModifyInstallModal, setShowModifyInstallModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showGOGExtras, setShowGOGExtras] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showMenu) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowMenu(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showMenu])

  const { is_installed, title } = gameInfo

  const hasRequirements = (gameExtraInfo?.reqs || []).length > 0

  return (
    <>
      <div ref={menuRef} className={`game-actions ${showMenu ? 'open' : ''}`}>
        <Tooltip content={t('submenu.options', 'Options')}>
          <Button
            variant="ghost"
            className="toggle"
            aria-label={t('submenu.options', 'Options')}
            aria-haspopup="menu"
            aria-expanded={showMenu}
            onClick={() => setShowMenu((open) => !open)}
            icon={<Icon glyph={EllipsisVertical} size="lg" />}
          />
        </Tooltip>

        <div className="gameToolsWrapper" onClick={() => setShowMenu(false)}>
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
            changelog={gameExtraInfo?.changelog}
            runner={gameInfo.runner}
            handleUpdate={handleUpdate}
            handleChangeLog={() => setShowChangelog(true)}
            disableUpdate={is.installing || is.updating}
            onShowRequirements={
              hasRequirements ? () => setShowRequirements(true) : undefined
            }
            onShowModifyInstall={() => setShowModifyInstallModal(true)}
            onShowGOGExtras={() => setShowGOGExtras(true)}
            gameInfo={gameInfo}
          />
        </div>
      </div>

      {showRequirements && (
        <Modal showCloseButton onClose={() => setShowRequirements(false)}>
          <ModalHeader>{t('game.requirements', 'Requirements')}</ModalHeader>
          <ModalContent>
            <GameRequirements reqs={gameExtraInfo?.reqs} />
          </ModalContent>
        </Modal>
      )}

      {showModifyInstallModal && (
        <ModifyInstallModal
          gameInfo={gameInfo}
          gameInstallInfo={gameInstallInfo}
          onClose={() => setShowModifyInstallModal(false)}
        />
      )}

      {showGOGExtras && (
        <GOGExtrasDialog
          appName={appName}
          onClose={() => setShowGOGExtras(false)}
        />
      )}

      {gameExtraInfo?.changelog && showChangelog && (
        <GameChangeLog
          title={gameInfo.overrides?.title || gameInfo.title}
          changelog={gameExtraInfo.changelog}
          backdropClick={() => {
            setShowChangelog(false)
          }}
        />
      )}
    </>
  )
}

export default DotsMenu
