import React from 'react'

export default function SearchBar() {
  return (
    <div className="SearchBar">
      <span>
        <input 
          className="searchInput" 
          onChange={(event) => console.log(event.target.value)} 
          placeholder={'Enter the game name here...'}
        />
          <button className="searchButton">Search Games</button>
        </span>
    </div>
  )
}
