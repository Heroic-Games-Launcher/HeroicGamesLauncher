import React, { useContext } from "react";
import { Link } from "react-router-dom";
import ContextProvider from "../../state/ContextProvider";

interface Props {
  renderBackButton: boolean;
  numberOfGames?: number;
  goTo: string;
  handleFilter?: (value: string) => void;
}

export default function Header({
  renderBackButton,
  numberOfGames,
  handleFilter,
  goTo,
}: Props) {
  const { filter } = useContext(ContextProvider);

  return (
    <>
      <div className="header">
        {handleFilter && (
          <span className="selectFilter">
            <span>Filter:</span>
            <span
              className={filter === "all" ? "selected" : ""}
              onClick={() => handleFilter("all")}
            >
              All
            </span>
            <span
              className={filter === "installed" ? "selected" : ""}
              onClick={() => handleFilter("installed")}
            >
              Installed
            </span>
            <span
              className={filter === "downloading" ? "selected" : ""}
              onClick={() => handleFilter("downloading")}
            >
              Downloading
            </span>
          </span>
        )}
        {Boolean(numberOfGames) && (
          <span className="totalGamesText">Total Games: {numberOfGames}</span>
        )}
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
