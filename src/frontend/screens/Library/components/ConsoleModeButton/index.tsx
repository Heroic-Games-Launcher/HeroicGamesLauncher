import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Tv } from 'lucide-react'
import Button from 'frontend/components/UI/Button'
import ContextProvider from 'frontend/state/ContextProvider'

interface ConsoleModeButtonProps {
  'data-tour'?: string
}

function ConsoleModeButton({
  'data-tour': dataTour
}: ConsoleModeButtonProps = {}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showDialogModal } = useContext(ContextProvider)

  const handleClick = () => {
    showDialogModal({
      title: t('console.confirm.title', 'Enter Console Mode?'),
      message: t(
        'console.confirm.message',
        'Console Mode is a fullscreen, controller friendly interface. The sidebar and window controls will be hidden.'
      ),
      buttons: [
        {
          text: t('console.confirm.enter', 'Enter Console Mode'),
          onClick: () => navigate('/console')
        },
        {
          text: t('button.cancel', 'Cancel')
        }
      ],
      type: 'MESSAGE'
    })
  }

  return (
    <Button
      variant="secondary"
      size="md"
      icon={<Tv size={16} strokeWidth={2} aria-hidden />}
      onClick={handleClick}
      data-tour={dataTour || 'library-console-mode'}
    >
      {t('sidebar.console', 'Console Mode')}
    </Button>
  )
}

export default ConsoleModeButton
