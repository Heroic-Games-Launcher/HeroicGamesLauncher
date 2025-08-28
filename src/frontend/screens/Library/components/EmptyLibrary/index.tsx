import { Trans, useTranslation } from 'react-i18next'
import './index.css'
import { NavLink } from 'react-router-dom'
import AddGameButton from '../AddGameButton'
import { useStoreConfigs } from 'frontend/hooks/useStoreConfigs'

function EmptyLibraryMessage() {
  const { storeConfigs } = useStoreConfigs()
  const { i18n } = useTranslation()

  let message = (
    <Trans i18n={i18n} i18nKey="emptyLibrary.noGames">
      Your library is empty.
      <br />
      <br />
      Click <NavLink to="/login">here</NavLink> to log in with your Epic,
      GOG.com, or Amazon accounts. Then, your games will show up here in the
      Library.
      <br />
      <br />
      To use games or apps from other sources, click <AddGameButton /> to add
      them manually.
    </Trans>
  )

  const hasGames = storeConfigs.some(({ store }) => store.library.length > 0)
  if (hasGames) {
    message = (
      <Trans i18n={i18n} i18nKey="emptyLibrary.noResults">
        The current filters produced no results.
      </Trans>
    )
  }

  return <p className="noResultsMessage">{message}</p>
}

export default EmptyLibraryMessage
