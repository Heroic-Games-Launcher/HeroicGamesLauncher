import React from "react";
import { Link } from "react-router-dom";

interface Card {
  cover: string;
  title: string;
  appName: string;
  isInstalled: boolean;
}

const GameCard = ({ cover, title, appName, isInstalled }: Card) => {
  return (
    <Link
      className="gameCard "
      style={{ backgroundColor: isInstalled ? "#F0183C" : "#2B2B2B" }}
      to={{
        pathname: `/gameconfig/${appName}`
      }}
    >
      <img alt="cover-art" src={cover} className="gameImg" />
      <div className="gameTitle">
        <span>{title}</span>
        <i
          className={`material-icons ${
            isInstalled ? "is-primary" : "is-success"
          }`}
        >
          {isInstalled ? "play_circle" : "get_app"}
        </i>
      </div>
    </Link>
  );
};

export default GameCard;
