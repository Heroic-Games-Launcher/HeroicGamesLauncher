import React, { useContext, useState } from 'react'
import ContextProvider from '../../state/ContextProvider'

export default function SearchBar() {
  const { handleSearch } = useContext(ContextProvider)
  const [textValue, setTextValue] = useState('')

  return (
    <div className="SearchBar">
      <span onClick={() => handleSearch(textValue)} className="material-icons">
        search
      </span>
      <input
        className="searchInput"
        value={textValue}
        onChange={(event) => {
          setTextValue(event.target.value)
          handleSearch(event.target.value)
        }}
        placeholder={'Enter the game name here...'}
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
