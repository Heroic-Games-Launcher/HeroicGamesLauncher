import React, { useCallback, useContext, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'
import FormControl from '../FormControl'
import './index.css'

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

  return (
    <div className="SearchBar" data-testid="searchBar">
      {/* TODO change placeholder for Unreal Marketplace */}
      <FormControl onClear={onClear}>
        <input
          ref={input}
          data-testid="searchInput"
          placeholder={t('search')}
          id="search" // this id is used for the virtualkeyboard, don't change it
          className="FormControl__input"
        />
      </FormControl>
    </div>
  )
}
