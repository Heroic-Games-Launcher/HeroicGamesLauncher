import React, { ReactNode } from 'react'
import { Link } from "react-router-dom";

interface Props {
  user: string;
  handleOnClick: (action: string) => void;
  children?: ReactNode;
  title?: string;
  renderBackButton: boolean;
}

export default function NavBar({ title, children, user, handleOnClick, renderBackButton }: Props) {
  return (
    <>
    {title && <div className="pageTitle">{title}</div>}
    <div className="topBar">
      <div className="leftCluster">
      {renderBackButton && <Link to={"/"}>Back to Library</Link>}
      </div>
      <div className="rightCluster">
        {!user ? <div onClick={() => handleOnClick('login')} className="username">Login</div>
        : <div onClick={() => handleOnClick('logout')} className="username">{user} (logout)</div>}
        <div className="settings"></div>
      </div>
    </div>
    </>
  )
}
