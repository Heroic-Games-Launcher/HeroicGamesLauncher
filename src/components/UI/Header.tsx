import React from "react";
import { Link, useHistory } from "react-router-dom";
import ToggleSwitch from './ToggleSwitch';

interface Props {
  renderBackButton: boolean;
  numberOfGames?: number;
  handleOnlyInstalled?: () => void;
}

export default function Header({ renderBackButton, numberOfGames, handleOnlyInstalled }: Props) {
  const history = useHistory()
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
            <span className="returnLink" onClick={() => history.goBack()}>
              <span className="material-icons">arrow_back</span>
              Return
            </span>
          </div>
      )}
      </div>
    </>
  );
}
