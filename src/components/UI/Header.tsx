import React from "react";
import { Link } from "react-router-dom";

interface Props {
  title?: string;
  renderBackButton: boolean;
}

export default function Header({ title, renderBackButton }: Props) {
  return (
    <>
      <div className="header">
      {title && <div className="pageTitle">{title}</div>}
      {renderBackButton && (
          <div className="leftCluster">
            <Link className="returnLink" to={"/"}>
              <span className="material-icons">arrow_back</span>
              Return
            </Link>
          </div>
      )}
      </div>
    </>
  );
}
