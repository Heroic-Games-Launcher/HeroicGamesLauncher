import React from "react";
import { legendary, openAboutWindow } from "../../helper";
import ContextProvider from '../../state/ContextProvider';

export default function UserSelector() {
  const { user, refresh, refreshLibrary } = React.useContext(ContextProvider)
  const handleLogout = async () => {
    // eslint-disable-next-line no-restricted-globals
    if (confirm("are you sure?")) {
      await legendary(`auth --delete`);
      await legendary(`cleanup`);
      refresh();
    }
  };

  return (
    <div className="UserSelector">

      <div className="navbar-link">
        {user}
      </div>
      <div className="navbar-dropdown">
        <a className="navbar-item"
          onClick={() => refreshLibrary()}
        >Refresh library</a>
        <a className="navbar-item"
          onClick={() => openAboutWindow()}
        >About</a>
        <a className="navbar-item"
          onClick={() => handleLogout()}
        >Logout</a>
      </div>




      {/* <span className="userName">
        {user}
        <span className="material-icons">arrow_drop_down</span>
      </span>
      <div
        onClick={() => refreshLibrary()}
        className="userName hidden"
      >
        Refresh Library
      </div>
      <div onClick={() => openAboutWindow()} className="userName hidden">
        About
      </div>      <div onClick={() => handleLogout()} className="userName hidden">
        Logout
      </div> */}
    </div>
  );
}
