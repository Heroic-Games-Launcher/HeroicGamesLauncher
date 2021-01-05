import React from "react";
import { legendary } from "../../helper";
import ContextProvider from '../../state/ContextProvider';

export default function UserSelector() {
  const { user, refresh } = React.useContext(ContextProvider)
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
      <span className="userName">
        {user}
        <span className="material-icons">arrow_drop_down</span>
      </span>
      <div
        onClick={() => refresh()}
        className="userName hidden"
      >
        Refresh Library
      </div>
      <div className="userName hidden">About</div>
      <div onClick={() => handleLogout()} className="userName hidden">
        Logout
      </div>
    </div>
  );
}
