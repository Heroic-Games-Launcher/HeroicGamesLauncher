import React from "react";
interface Props {
  handleSearch: (input: string) => void;
}

export default function SearchBar({ handleSearch }: Props) {
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
