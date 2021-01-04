import React, { Dispatch, SetStateAction } from "react";
import { legendary } from "../../helper";

interface Props {
  user: string;
  handleRefresh: Dispatch<SetStateAction<boolean>>;
}

export default function UserSelector({ user, handleRefresh }: Props) {
  const handleLogout = async () => {
    // eslint-disable-next-line no-restricted-globals
    if (confirm("are you sure?")) {
      await legendary(`auth --delete`);
      handleRefresh(true);
      await legendary(`cleanup`);
      handleRefresh(false);
    }
  };

  return (
    <div className="UserSelector">
      <span className="userName">
        {user}
        <span className="material-icons">arrow_drop_down</span>
      </span>
      <div
        onClick={() => handleRefresh(true)}
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
