import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import Button from 'frontend/components/UI/Button'
import LibraryContext from '../../LibraryContext'

interface AddGameButtonProps {
  'data-tour'?: string
}

function AddGameButton({ 'data-tour': dataTour }: AddGameButtonProps = {}) {
  const { t } = useTranslation()
  const { handleAddGameButtonClick } = useContext(LibraryContext)

  return (
    <Button
      variant="secondary"
      size="md"
      icon={<Plus size={16} strokeWidth={2} aria-hidden />}
      onClick={handleAddGameButtonClick}
      data-tour={dataTour || 'library-add-game'}
    >
      {t('add_game', 'Add Game')}
    </Button>
  )
}

export default AddGameButton
