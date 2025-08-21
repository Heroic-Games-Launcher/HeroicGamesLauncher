import { useContext, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { GameInfo } from 'common/types'
import SearchBar from '../SearchBar'
import { useTranslation } from 'react-i18next'
import LibraryContext from 'frontend/screens/Library/LibraryContext'
import { useStoreConfigs } from 'frontend/hooks/useStoreConfigs'

function fixFilter(text: string) {
  const regex = new RegExp(/([?\\|*|+|(|)|[|]|])+/, 'g')
  return text.replaceAll(regex, '')
}

export default function LibrarySearchBar() {
  const { storeConfigs, runnerToDisplayName } = useStoreConfigs()
  const { handleSearch, filterText } = useContext(LibraryContext)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const list = useMemo(() => {
    return storeConfigs
      .flatMap(({ store }) => store.library)
      .filter((el) => {
        return (
          !el.install.is_dlc &&
          new RegExp(fixFilter(filterText), 'i').test(el.title)
        )
      })
      .sort((g1, g2) => (g1.title < g2.title ? -1 : 1))
  }, [storeConfigs, filterText])

  const handleClick = (game: GameInfo) => {
    handleSearch('')
    navigate(`/gamepage/${game.runner}/${game.app_name}`, {
      state: { gameInfo: game }
    })
  }

  const suggestions = list.map((game) => (
    <li onClick={() => handleClick(game)} key={game.app_name}>
      {game.title} <span>{runnerToDisplayName(game.runner, game.runner)}</span>
    </li>
  ))

  const onInputChanged = (text: string) => {
    handleSearch(text)
  }

  return (
    <div data-tour="library-search">
      <SearchBar
        suggestionsListItems={suggestions}
        onInputChanged={onInputChanged}
        value={filterText}
        placeholder={t('search', 'Search for Games')}
      />
    </div>
  )
}
