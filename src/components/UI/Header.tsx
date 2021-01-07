import React from "react";
import { Link } from "react-router-dom";
import ToggleSwitch from './ToggleSwitch';

interface Props {
  renderBackButton: boolean;
  numberOfGames?: number;
  handleOnlyInstalled?: () => void;
}

export default function Header({ renderBackButton, numberOfGames, handleOnlyInstalled }: Props) {
  return (
    <>
      <div className="header">
      {
      handleOnlyInstalled && 
        <span className="installedSwitch" >
          <span>Installed Only</span>
          <ToggleSwitch handleChange={() => handleOnlyInstalled()} />
        </span>
      }
      {Boolean(numberOfGames) && 
          <span className="totalGamesText">Total Games: {numberOfGames}</span>}
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
