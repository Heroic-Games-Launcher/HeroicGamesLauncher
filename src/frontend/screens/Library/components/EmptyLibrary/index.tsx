import React, { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import './index.css'
import { NavLink } from 'react-router-dom'
import AddGameButton from '../AddGameButton'
import { useShallowGlobalState } from 'frontend/state/GlobalStateV2'

function EmptyLibraryMessage() {
  const { epicLibrary, gogLibrary, amazonLibrary, sideloadedLibrary } =
    useShallowGlobalState(
      'epicLibrary',
      'gogLibrary',
      'amazonLibrary',
      'sideloadedLibrary'
    )
  const { i18n } = useTranslation()

  const message = useMemo(() => {
    const librariesEmpty = !(
      epicLibrary.length ||
      Object.keys(gogLibrary).length ||
      amazonLibrary.length ||
      sideloadedLibrary.length
    )
    if (librariesEmpty)
      return (
        <Trans i18n={i18n} i18nKey="emptyLibrary.noGames">
          Your library is empty. You can <NavLink to="/login">log in</NavLink>{' '}
          using a store or click <AddGameButton /> to add one manually.
        </Trans>
      )
    return (
      <Trans i18n={i18n} i18nKey="emptyLibrary.noResults">
        The current filters produced no results.
      </Trans>
    )
  }, [i18n, epicLibrary, gogLibrary, amazonLibrary, sideloadedLibrary])

  return <p className="noResultsMessage">{message}</p>
}

export default EmptyLibraryMessage
