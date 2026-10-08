import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
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
      <Plus size={16} strokeWidth={2} aria-hidden />
      <span>{t('add_game', 'Add Game')}</span>
    </button>
  )
}

export default AddGameButton
