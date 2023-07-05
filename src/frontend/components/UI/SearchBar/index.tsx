import { Search } from '@mui/icons-material'
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef
} from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import ContextProvider from 'frontend/state/ContextProvider'
import './index.scss'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { GameInfo } from '../../../../common/types'

function fixFilter(text: string) {
  const regex = new RegExp(/([?\\|*|+|(|)|[|]|])+/, 'g')
  return text.replaceAll(regex, '')
}

const RUNNER_TO_STORE = {
  legendary: 'Epic',
  gog: 'GOG',
  nile: 'Amazon'
}

export default React.memo(function SearchBar() {
  const { handleSearch, filterText, epic, gog, sideloadedLibrary, amazon } =
    useContext(ContextProvider)
  const { t } = useTranslation()
  const navigate = useNavigate()

  const input = useRef<HTMLInputElement>(null)

  const list = useMemo(() => {
    return [
      ...(epic.library ?? []),
      ...(gog.library ?? []),
      ...(sideloadedLibrary ?? []),
      ...(amazon.library ?? [])
    ]
      .filter(Boolean)
      .filter((el) => {
        return (
          !el.install.is_dlc &&
          new RegExp(fixFilter(filterText), 'i').test(el.title)
        )
      })
      .sort((g1, g2) => (g1.title < g2.title ? -1 : 1))
  }, [amazon.library, epic.library, gog.library, filterText])

  // we have to use an event listener instead of the react
  // onChange callback so it works with the virtual keyboard
  useEffect(() => {
    if (input.current) {
      const element = input.current
      element.value = filterText
      const handler = () => {
        handleSearch(element.value)
      }
      element.addEventListener('input', handler)
      return () => {
        element.removeEventListener('input', handler)
      }
    }
    return
  }, [input])

  const onClear = useCallback(() => {
    handleSearch('')
    if (input.current) {
      input.current.value = ''
      input.current.focus()
    }
  }, [input])

  const handleClick = (game: GameInfo) => {
    handleSearch('')
    if (input.current) {
      input.current.value = ''

      navigate(`/gamepage/${game.runner}/${game.app_name}`, {
        state: { gameInfo: game }
      })
    }
  }

  return (
    <div className="SearchBar" data-testid="searchBar">
      <span className="searchButton" tabIndex={-1}>
        {<Search />}
      </span>
      <input
        ref={input}
        data-testid="searchInput"
        placeholder={t('search')}
        // this id is used for the virtualkeyboard, don't change it,
        // if this must be changed, reflect the change in src/helpers/virtualKeyboard.ts#searchInput
        // and in src/helpers/gamepad.ts#isSearchInput
        id="search"
        className="searchBarInput"
      />
      {filterText.length > 0 && (
        <>
          <ul className="autoComplete">
            {list.length > 0 &&
              list.map((game) => (
                <li onClick={() => handleClick(game)} key={game.app_name}>
                  {game.title}{' '}
                  <span>({RUNNER_TO_STORE[game.runner] || game.runner})</span>
                </li>
              ))}
          </ul>

          <button className="clearSearchButton" onClick={onClear} tabIndex={-1}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </>
      )}
    </div>
  )
})
