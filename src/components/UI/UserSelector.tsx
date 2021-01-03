import React from 'react'
import { legendary } from '../../helper'

interface Props {
  user: string
  handleOnClick: (value: string) => void
}

export default function UserSelector({user, handleOnClick}: Props) {
  // const handleLogout = async () => {
  //   setStatus({
  //     loading: true,
  //     message: "Logging Out...",
  //   });
  //   await legendary(`auth --delete`);
  //   await legendary(`cleanup`);
  //   refresh(true);
  //   setStatus({ loading: false, message: "'You're Logged out!" });
  //   refresh(false);
  // };

  return (
    <div className="UserSelector">
      {!user ? <div onClick={() => handleOnClick('login')} className="username">Login</div>
        : <div onClick={() => handleOnClick('logout')} className="username">{user} (logout)</div>}
    </div>
  )
}

function refreshGameList(refresh: React.Dispatch<React.SetStateAction<boolean>>): ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void) | undefined {
  return async () => {
    refresh(true)
    await legendary('list-games')
    refresh(false)
  }
}
