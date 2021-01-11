import React from "react";
import { legendary, openAboutWindow } from "../../helper";
import ContextProvider from '../../state/ContextProvider';

export default function UserSelector() {
  const { user, refresh, refreshLibrary } = React.useContext(ContextProvider)

  // there has to be a better place for this, right?
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

      <div className="navbar-link">{user}</div>

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

    </div>
  );
}
