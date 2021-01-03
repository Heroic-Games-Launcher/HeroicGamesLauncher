import React from 'react'

interface Props {
  user: string
  handleOnClick: (value: string) => void
}

export default function UserSelector({user, handleOnClick}: Props) {
  return (
    <div className="UserSelector">
      {!user ? <div onClick={() => handleOnClick('login')} className="username">Login</div>
        : <div onClick={() => handleOnClick('logout')} className="username">{user} (logout)</div>}
    </div>
  )
}
