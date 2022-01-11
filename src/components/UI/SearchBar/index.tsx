import './index.css'

import React, { useContext, useEffect, useRef } from 'react'

import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import ContextProvider from 'src/state/ContextProvider'

export default function SearchBar() {
  const { handleSearch, filterText } = useContext(ContextProvider)
  const { t } = useTranslation()
  const input = useRef<HTMLInputElement>(null)

  // we have to use an event listener instead of the react
  // onChange callback so it works with the virtual keyboard
  useEffect(() => {
    if (input.current) {
      const element = input.current
      element.value = filterText
      element.addEventListener('input', () => {
        handleSearch(element.value)
      })
    }
  }, [input])

  return (
    <div className="SearchBar" data-testid="searchBar">
      <input
        ref={input}
        data-testid="searchInput"
        className="searchInput"
        placeholder={t('search')}
        id="search"
      />
      <span
        className={classNames('clearSearchInput', {
          isEmpty: !input.current || input.current.value == ''
        })}
        onClick={() => {
          handleSearch('')
          if (input.current) {
            input.current.value = ''
          }
        }}
      >
        &times;
      </span>
    </div>
  )
}
