import React, { useContext, useState } from "react";
import ContextProvider from '../../state/ContextProvider';

export default function SearchBar() {
  const { handleSearch } = useContext(ContextProvider)
  const [textValue, setTextValue] = useState('')

  return (

      <p className="control has-icons-left ">

        <input type="text" className="input is-primary is-rounded"
          value={textValue}
          onChange={(event) => {
            setTextValue(event.target.value)
            handleSearch(event.target.value)
          }}
          placeholder="Search for games"
        />

        <span className="icon is-left">
          <span className="mdi mdi-24px mdi-magnify"></span>
        </span>

          {/* commented because it really isn't necessary for now. candy to do later */}
        {/* <span className="icon is-right"
          onClick={() => {
            setTextValue('')
            handleSearch('')
          }}  
        >
          <span className="material-icons">close</span>
        </span> */}
      </p>




// left below for future use in functionality refactoring and attaching
    // <div className="SearchBar">
    //   <span 
    //     onClick={() => handleSearch(textValue)}
    //     className="material-icons">search</span>
    //   <input
    //     className="input"
    //     value={textValue}
    //     onChange={(event) => {
    //       setTextValue(event.target.value)
    //       handleSearch(event.target.value)
    //     }}
    //     placeholder={"Search for games"}
    //   />
    //   <span 
    //     onClick={() => {
    //       setTextValue('')
    //       handleSearch('')
    //     }}
    //     className="material-icons close">close</span>
    // </div>
  );
}
