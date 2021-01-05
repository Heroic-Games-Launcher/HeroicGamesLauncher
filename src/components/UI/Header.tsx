import React from 'react'
import { Link } from "react-router-dom";

interface Props {
  title?: string;
  renderBackButton: boolean;
}

export default function Header({ title, renderBackButton }: Props) {
  return (
    <>
    {title && <div className="pageTitle">{title}</div>}
    <div className="header">
      <div className="leftCluster">
      {renderBackButton &&         <Link className="returnLink" to={"/"}>
          <span className="material-icons" >
            arrow_back
          </span>
          Return
          </Link>}
      </div>
    </div>
    </>
  )
}
