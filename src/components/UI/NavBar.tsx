import React from 'react'

interface Props {
  hasGames: boolean;
  user: string;
}

export default function NavBar({ hasGames, user}: Props) {
  return (
    <>
    <div className="pageTitle">{hasGames ? 'Library' : 'No Games Found'}</div>
    <div className="topBar">
      <div className="leftCluster"></div>
      <div className="rightCluster">
        <div className="username">{user}</div>
        <div className="settings"></div>
      </div>
    </div>
    </>
  )
}
