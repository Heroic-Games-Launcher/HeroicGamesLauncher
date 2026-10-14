import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { openInstallGameModal } from 'frontend/state/InstallGameModal'
import { GameHandle } from '../../../../helpers/ipc'

interface AddGameButtonProps {
  'data-tour'?: string
}

function AddGameButton({ 'data-tour': dataTour }: AddGameButtonProps = {}) {
  const { t } = useTranslation()

  const handleAddGameButtonClick = useCallback(() => {
    // FIXME: We should never create a GameHandle manually. Ideally we'd
    //        ask the backend to create one, and then operate on it
    const game = new GameHandle('', 'sideload')
    openInstallGameModal({ game, gameInfo: null, action: 'install' })
  }, [])

  return (
    <button
      className="sideloadGameButton"
      onClick={handleAddGameButtonClick}
      data-tour={dataTour || 'library-add-game'}
    >
      {t('add_game', 'Add Game')}
    </button>
  )
}

export default AddGameButton
