import { Power } from 'lucide-react'
import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { handleQuit } from 'frontend/helpers'
import ContextProvider from 'frontend/state/ContextProvider'

interface QuitButtonProps {
  dataTour?: string
}

const QuitButton: React.FC<QuitButtonProps> = ({ dataTour }) => {
  const { t } = useTranslation()
  const { showDialogModal } = useContext(ContextProvider)

  const handleQuitButton = () => {
    showDialogModal({
      title: t('userselector.quit', 'Quit'),
      message: t('userselector.quitMessage', 'Are you sure you want to quit?'),
      buttons: [
        {
          text: t('userselector.quit', 'Quit'),
          onClick: handleQuit
        },
        {
          text: t('userselector.cancel', 'Cancel'),
          onClick: () => null
        }
      ]
    })
  }

  return (
    <button
      className="Sidebar__item"
      onClick={() => handleQuitButton()}
      data-tour={dataTour}
    >
      <div className="Sidebar__itemIcon">
        <Power size={22} strokeWidth={1.75} aria-hidden />
      </div>
      <span>{t('userselector.quit', 'Quit')}</span>
    </button>
  )
}

export default QuitButton
