import React, { useContext, useState } from "react";
import ContextProvider from '../../state/ContextProvider';

export default function SearchBar() {
  const { handleSearch } = useContext(ContextProvider)
  const [textValue, setTextValue] = useState('')

  return (

      <p className="control has-icons-left ">

        <input type="search" className="input is-primary is-rounded"
          onChange={(event) => {
            setTextValue(event.target.value)
            handleSearch(event.target.value)
          }}
          placeholder="Search for games"
        />

        <span className="icon is-left">
          <span className="mdi mdi-24px mdi-magnify"></span>
        </span>
      </p>
  );
}
