import React, { useContext } from "react";
import { useHistory } from "react-router-dom";
import ContextProvider from '../../state/ContextProvider';
import ToggleSwitch from './ToggleSwitch';

interface Props {
  renderBackButton: boolean;
  numberOfGames?: number;
  handleOnlyInstalled?: () => void;
}

// TODO: pass in a list of total games, to show how many are hidden
export default function Header({ renderBackButton, numberOfGames, handleOnlyInstalled }: Props) {
  const history = useHistory()
  const { onlyInstalled } = useContext(ContextProvider)
  return (
      <div className="header level">
      {
      handleOnlyInstalled && 
        <span className="installedSwitch level-left" >
          <div className="level-item">
            <ToggleSwitch description="Downloaded Only" value={onlyInstalled} handleChange={() => handleOnlyInstalled()} />
          </div>
        </span>
      }
      {Boolean(numberOfGames) && 
          <span className="totalGamesText level-right">
            <div className="level-item">
              Total Games: {numberOfGames}
            </div>
          </span>}
      {renderBackButton && (
          <div className="leftCluster">
            <span className="returnLink" onClick={() => history.goBack()}>
              <span className="material-icons">arrow_back</span>
              Return
            </span>
          </div>
      )}
      </div>
  );
}
