import { faPowerOff } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { handleQuit } from 'frontend/helpers'

const QuitButton: React.FC = () => {
  const { t } = useTranslation()
  return (
    <button className="Sidebar__item" onClick={handleQuit}>
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
