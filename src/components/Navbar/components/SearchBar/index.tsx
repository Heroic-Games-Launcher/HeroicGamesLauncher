import './index.css'

import React, { useContext, useState } from 'react'

import { useTranslation } from 'react-i18next'
import Close from '@material-ui/icons/Close'
import ContextProvider from 'src/state/ContextProvider'
import Search from '@material-ui/icons/Search'

export default function SearchBar() {
  const { handleSearch } = useContext(ContextProvider)
  const [textValue, setTextValue] = useState('')
  const { t } = useTranslation()

  return (
    <div className="SearchBar" data-testid="searchBar">
      <label htmlFor="search">
        <Search
          onClick={() => handleSearch(textValue)}
          className="material-icons"
          data-testid="searchButton"
        />
      </label>
      <input
        data-testid="searchInput"
        className="searchInput"
        value={textValue}
        onChange={(event) => {
          setTextValue(event.target.value)
          handleSearch(event.target.value)
        }}
        placeholder={t('search')}
        id="search"
      />

      {textValue.length > 0 && (
        <Close
          onClick={() => {
            setTextValue('')
            handleSearch('')
          }}
          className="material-icons close"
          data-testid="closeButton"
        />
      )}
    </div>
  )
}
