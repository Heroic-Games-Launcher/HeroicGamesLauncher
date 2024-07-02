import React, { useContext, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { GameInfo } from '../../../../common/types'
import SearchBar from '../SearchBar'
import { useTranslation } from 'react-i18next'
import LibraryContext from 'frontend/screens/Library/LibraryContext'
import { useShallowGlobalState } from 'frontend/state/GlobalStateV2'

function fixFilter(text: string) {
  const regex = new RegExp(/([?\\|*|+|(|)|[|]|])+/, 'g')
  return text.replaceAll(regex, '')
}

const RUNNER_TO_STORE = {
  legendary: 'Epic',
  gog: 'GOG',
  nile: 'Amazon'
}

export default function LibrarySearchBar() {
  const { epicLibrary, gogLibrary, amazonLibrary, sideloadedLibrary } =
    useShallowGlobalState(
      'epicLibrary',
      'gogLibrary',
      'amazonLibrary',
      'sideloadedLibrary'
    )
  const { handleSearch, filterText } = useContext(LibraryContext)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const list = useMemo(() => {
    return [
      ...epicLibrary,
      ...Object.values(gogLibrary),
      ...amazonLibrary,
      ...sideloadedLibrary
    ]
      .filter(Boolean)
      .filter((el) => {
        return (
          !el.install.is_dlc &&
          new RegExp(fixFilter(filterText), 'i').test(el.title)
        )
      })
      .sort((g1, g2) => (g1.title < g2.title ? -1 : 1))
  }, [epicLibrary, gogLibrary, amazonLibrary, sideloadedLibrary, filterText])

  const handleClick = (game: GameInfo) => {
    handleSearch('')
    navigate(`/gamepage/${game.runner}/${game.app_name}`, {
      state: { gameInfo: game }
    })
  }

  const suggestions = list.map((game) => (
    <li onClick={() => handleClick(game)} key={game.app_name}>
      {game.title} <span>({RUNNER_TO_STORE[game.runner] || game.runner})</span>
    </li>
  ))

  const onInputChanged = (text: string) => {
    handleSearch(text)
  }

  return (
    <SearchBar
      suggestionsListItems={suggestions}
      onInputChanged={onInputChanged}
      value={filterText}
      placeholder={t('search', 'Search for Games')}
    />
  )
}
