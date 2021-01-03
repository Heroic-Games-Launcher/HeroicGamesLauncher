import React from 'react'

export default function SearchBar() {
  return (
    <div className="SearchBar">
      <span>
        <input 
          className="searchInput" 
          onChange={(event) => console.log(event.target.value)} 
          placeholder={'Search for Games'}
        />
          <button className="searchButton">Search Games</button>
        </span>
    </div>
  )
}
