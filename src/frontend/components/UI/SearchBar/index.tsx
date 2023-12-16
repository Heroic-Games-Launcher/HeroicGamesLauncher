import { Search } from '@mui/icons-material'
import React, { Fragment, useCallback, useEffect, useRef } from 'react'
import './index.scss'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

interface Props {
  suggestionsListItems?: JSX.Element[]
  onInputChanged: (text: string) => void
  value: string
  placeholder: string
}

export default function SearchBar({
  suggestionsListItems,
  onInputChanged,
  value,
  placeholder
}: Props) {
  const input = useRef<HTMLInputElement>(null)

  // we have to use an event listener instead of the react
  // onChange callback so it works with the virtual keyboard
  useEffect(() => {
    if (input.current) {
      const element = input.current
      element.value = value
      const handler = () => {
        onInputChanged(element.value)
      }
      element.addEventListener('input', handler)
      return () => {
        element.removeEventListener('input', handler)
      }
    }
    return
  }, [input])

  const onClear = useCallback(() => {
    onInputChanged('')
    if (input.current) {
      input.current.value = ''
      input.current.focus()
    }
  }, [input])

  return (
    <div className="SearchBar" data-testid="searchBar">
      <span className="searchButton" tabIndex={-1}>
        {<Search />}
      </span>
      <input
        ref={input}
        data-testid="searchInput"
        placeholder={placeholder}
        // this id is used for the virtualkeyboard, don't change it,
        // if this must be changed, reflect the change in src/helpers/virtualKeyboard.ts#searchInput
        // and in src/helpers/gamepad.ts#isSearchInput
        id="search"
        className="searchBarInput"
      />
      {value.length > 0 && (
        <>
          <ul className="autoComplete">
            {suggestionsListItems &&
              suggestionsListItems.length > 0 &&
              suggestionsListItems.map((li, idx) => (
                <Fragment key={idx}>{li}</Fragment>
              ))}
          </ul>

          <button className="clearSearchButton" onClick={onClear} tabIndex={-1}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </>
      )}
    </div>
  )
}
