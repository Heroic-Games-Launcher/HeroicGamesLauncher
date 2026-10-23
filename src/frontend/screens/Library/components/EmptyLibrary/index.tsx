import { useContext } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'
import { Trans, useTranslation } from 'react-i18next'
import { LibraryBig, SearchX } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import EmptyState from 'frontend/components/UI/EmptyState'
import './index.css'
import AddGameButton from '../AddGameButton'

function EmptyLibraryMessage() {
  const { epic, gog, amazon, zoom, sideloadedLibrary } =
    useContext(ContextProvider)
  const { t, i18n } = useTranslation()

  const hasGames =
    epic.library.length +
      gog.library.length +
      amazon.library.length +
      zoom.library.length +
      sideloadedLibrary.length >
    0

  if (hasGames) {
    return (
      <EmptyState
        className="noResultsMessage"
        glyph={SearchX}
        title={t('emptyLibrary.noResultsTitle', 'No games found')}
        description={t(
          'emptyLibrary.noResults',
          'The current filters produced no results.'
        )}
      />
    )
  }

  return (
    <EmptyState
      className="noResultsMessage"
      glyph={LibraryBig}
      title={t('emptyLibrary.title', 'Your library is empty.')}
      description={
        <Trans i18n={i18n} i18nKey="emptyLibrary.description">
          <NavLink to="/login">Log in</NavLink> with your Epic, GOG.com, Amazon
          or Zoom accounts and your games will show up here. You can also add
          games from other sources manually.
        </Trans>
      }
      action={<AddGameButton />}
    />
  )
}

export default EmptyLibraryMessage
