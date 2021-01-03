import React from 'react'
interface Props {
  handleSearch: (input: string) => void
}

export default function SearchBar({handleSearch}: Props) {
  return (
    <div className="SearchBar">
      <span>
        <input 
          className="searchInput" 
          onChange={(event) => handleSearch(event.target.value)} 
          placeholder={'Enter the game name here...'}
        />
          <button className="searchButton">Search Games</button>
        </span>
    </div>
  )
}
