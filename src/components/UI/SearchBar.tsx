import React, { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from '../../state/ContextProvider'

export default function SearchBar() {
  const { handleSearch } = useContext(ContextProvider)
  const [textValue, setTextValue] = useState('')
  const { t } = useTranslation()

  return (
    <div className="SearchBar">
      <label htmlFor="search"><span onClick={() => handleSearch(textValue)} className="material-icons">
          search
      </span>
      </label>
      <input
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
        <span
          onClick={() => {
            setTextValue('')
            handleSearch('')
          }}
          className="material-icons close"
        >
          close
        </span>
      )}
    </div>
  )
}
