import React, { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Search from '@material-ui/icons/Search';
import Close from '@material-ui/icons/Close';
import ContextProvider from '../../state/ContextProvider'

export default function SearchBar() {
  const { handleSearch } = useContext(ContextProvider)
  const [textValue, setTextValue] = useState('')
  const { t } = useTranslation()

  return (
    <div className="SearchBar">
      <label htmlFor="search">
        <Search onClick={() => handleSearch(textValue)} className="material-icons" />
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
        <Close
          onClick={() => {
            setTextValue('')
            handleSearch('')
          }}
          className="material-icons close"
        />
      )}
    </div>
  )
}
