import React, { useContext } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'
import { Trans, useTranslation } from 'react-i18next'
import './index.css'
import { NavLink } from 'react-router-dom'
import AddGameButton from '../AddGameButton'

function EmptyLibraryMessage() {
  const { epic, gog, amazon, sideloadedLibrary } = useContext(ContextProvider)
  const { i18n } = useTranslation()

  let message = (
    <Trans i18n={i18n} i18nKey="emptyLibrary.noGames">
      Your library is empty. You can <NavLink to="/login">log in</NavLink> using
      a store or click <AddGameButton /> to add one manually.
    </Trans>
  )

  if (
    epic.library.length +
      gog.library.length +
      amazon.library.length +
      sideloadedLibrary.length >
    0
  ) {
    message = (
      <Trans i18n={i18n} i18nKey="emptyLibrary.noResults">
        The current filters produced no results.
      </Trans>
    )
  }

  return <p className="noResultsMessage">{message}</p>
}

export default EmptyLibraryMessage
