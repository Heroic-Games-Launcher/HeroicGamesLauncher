import React from "react";
import { Link } from "react-router-dom";

interface Props {
  renderBackButton: boolean;
  numberOfGames?: number;
  handleOnlyInstalled?: () => void;
}

export default function Header({ renderBackButton, numberOfGames, handleOnlyInstalled }: Props) {
  return (
    <>
      <div className="header">
      {handleOnlyInstalled && <span>
          <span>Installed Only</span>
          <input onChange={() => handleOnlyInstalled()}  type="checkbox" className="toggleSwitch"/>
      </span>}
      {Boolean(numberOfGames) && <span>
          <span>Total Games: {numberOfGames}</span>
      </span>}
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
