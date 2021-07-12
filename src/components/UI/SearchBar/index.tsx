import './index.css'

import React, { useContext, useState } from 'react'

import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'

export default function SearchBar() {
  const { handleSearch } = useContext(ContextProvider)
  const [textValue, setTextValue] = useState('')
  const { t } = useTranslation()

  return (
    <div className="SearchBar" data-testid="searchBar">
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
    </div>
  )
}
