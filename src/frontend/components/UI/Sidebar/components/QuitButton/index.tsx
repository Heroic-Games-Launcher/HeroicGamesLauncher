import { faPowerOff } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { handleQuit } from 'frontend/helpers'
import { useGlobalState } from 'frontend/state/GlobalStateV2'

const QuitButton: React.FC = () => {
  const { t } = useTranslation()

  const handleQuitButton = () => {
    const quitDialog = {
      showDialog: true,
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
    }
    useGlobalState.setState({ dialogModalOptions: quitDialog })
  }

  return (
    <button className="Sidebar__item" onClick={() => handleQuitButton()}>
      <div className="Sidebar__itemIcon">
        <FontAwesomeIcon
          icon={faPowerOff}
          title={t('userselector.quit', 'Quit')}
        />
      </div>
      <span>{t('userselector.quit', 'Quit')}</span>
    </button>
  )
}

export default QuitButton
