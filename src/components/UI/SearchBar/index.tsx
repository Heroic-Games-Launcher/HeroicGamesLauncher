import { Search } from '@mui/icons-material'
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef
} from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'
import FormControl from '../FormControl'
import './index.css'

function fixFilter(text: string) {
  const regex = new RegExp(/([?\\|*|+|(|)|[|]|])+/, 'g')
  return text.replaceAll(regex, '')
}

export default function SearchBar() {
  const { handleSearch, filterText, epic, gog } = useContext(ContextProvider)
  const { t } = useTranslation()
  const input = useRef<HTMLInputElement>(null)

  const list = useMemo(() => {
    const library = new Set(
      [...epic.library, ...gog.library].map((g) => g.title).sort()
    )
    return [...library].filter((i) =>
      new RegExp(fixFilter(filterText), 'i').test(i)
    )
  }, [epic.library, gog.library, filterText])

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

  const handleClick = (title: string) => {
    if (input.current) {
      input.current.value = title
      handleSearch(title)
    }
  }

  return (
    <div className="SearchBar" data-testid="searchBar">
      {/* TODO change placeholder for Unreal Marketplace */}
      <FormControl onClear={onClear} leftButton={<Search />}>
        <input
          ref={input}
          data-testid="searchInput"
          placeholder={t('search')}
          // this id is used for the virtualkeyboard, don't change it,
          // if this must be changed, reflect the change in src/helpers/virtualKeyboard.ts#searchInput
          // and in src/helpers/gamepad.ts#isSearchInput
          id="search"
          className="FormControl__input"
        />
        {filterText.length > 0 && (
          <ul className="autoComplete">
            {list.length > 0 &&
              list.map((title, i) => (
                <li
                  onClick={(e) => handleClick(e.currentTarget.innerText)}
                  key={i}
                >
                  {title}
                </li>
              ))}
          </ul>
        )}
      </FormControl>
    </div>
  )
}
