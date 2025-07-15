import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import LibraryContext from '../../LibraryContext'

interface AddGameButtonProps {
  'data-tour'?: string
}

function AddGameButton({ 'data-tour': dataTour }: AddGameButtonProps = {}) {
  const { t } = useTranslation()
  const { handleAddGameButtonClick } = useContext(LibraryContext)

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
