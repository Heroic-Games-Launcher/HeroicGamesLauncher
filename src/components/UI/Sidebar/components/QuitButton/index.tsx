import { faDoorOpen } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { handleQuit } from 'src/helpers'

const QuitButton: React.FC = () => {
  const { t } = useTranslation()
  return (
    <button className="Sidebar__item" onClick={handleQuit}>
      <div className="Sidebar__itemIcon">
        <FontAwesomeIcon icon={faDoorOpen} />
      </div>
      {t('userselector.quit', 'Quit')}
    </button>
  )
}

export default QuitButton
