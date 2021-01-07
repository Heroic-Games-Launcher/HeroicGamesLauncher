import React, { useContext } from "react";
import ContextProvider from '../../state/ContextProvider';

export default function SearchBar() {
  const { handleSearch } = useContext(ContextProvider)
  return (
    <div className="SearchBar">
      <span className="material-icons">search</span>
      <input
        className="searchInput"
        onChange={(event) => handleSearch(event.target.value)}
        placeholder={"Enter the game name here..."}
      />
    </div>
  );
}
