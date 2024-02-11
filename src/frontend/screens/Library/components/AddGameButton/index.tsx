import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import LibraryContext from '../../LibraryContext'

function AddGameButton() {
  const { t } = useTranslation()
  const { handleAddGameButtonClick } = useContext(LibraryContext)

  return (
    <button className="sideloadGameButton" onClick={handleAddGameButtonClick}>
      {t('add_game', 'Add Game')}
    </button>
  )
}

export default AddGameButton
