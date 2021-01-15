import React, { useContext } from "react";
import { Link } from "react-router-dom";
import ContextProvider from '../../state/ContextProvider';
import ToggleSwitch from './ToggleSwitch';

interface Props {
  renderBackButton: boolean;
  numberOfGames?: number;
  goTo: string;
  handleOnlyInstalled?: () => void;
}

export default function Header({ renderBackButton, numberOfGames, handleOnlyInstalled, goTo }: Props) {
  const { onlyInstalled } = useContext(ContextProvider)
  
  return (
    <>
      <div className="header">
      {
      handleOnlyInstalled && 
        <span className="installedSwitch" >
          <span>Installed Only</span>
          <ToggleSwitch value={onlyInstalled} handleChange={() => handleOnlyInstalled()} />
        </span>
      }
      {Boolean(numberOfGames) && 
          <span className="totalGamesText">Total Games: {numberOfGames}</span>}
      {renderBackButton && (
          <div className="leftCluster">
            <Link className="returnLink" to={goTo}>
              <span className="material-icons">arrow_back</span>
              Return
            </Link>
          </div>
      )}
      </div>
    </>
  );
}
