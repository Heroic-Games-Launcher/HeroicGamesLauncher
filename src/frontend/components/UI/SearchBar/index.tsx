import { Fragment, useCallback, useEffect, useRef } from 'react'
import './index.scss'
import { Search, X } from 'lucide-react'

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      const typing =
        tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable
      if (e.key === '/' && !typing) {
        e.preventDefault()
        input.current?.focus()
      } else if (
        e.key === 'Escape' &&
        document.activeElement === input.current
      ) {
        input.current?.blur()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const onClear = useCallback(() => {
    onInputChanged('')
    if (input.current) {
      input.current.value = ''
      input.current.focus()
    }
  }, [input])

  return (
    <div className="SearchBar" data-testid="searchBar">
      <Search
        className="searchButton"
        size={22}
        strokeWidth={1.75}
        aria-hidden
      />
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
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </>
      )}
    </div>
  )
}
