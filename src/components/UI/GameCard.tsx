import React from "react";
import { Link } from "react-router-dom";

interface Card {
  cover: string;
  logo: string
  title: string;
  appName: string;
  isInstalled: boolean;
}

const GameCard = ({ cover, title, appName, isInstalled, logo }: Card) => {
  return (
    <Link
      className="gameCard"
      to={{
        pathname: `/gameconfig/${appName}`
      }}
    >
      {logo &&
        <img 
        alt="logo" 
        src={logo} 
        style={{ filter: isInstalled ? 'none' : 'grayscale(0.9)'}}
        className="gameLogo" />
      }
      <img 
        alt="cover-art" 
        src={cover} 
        style={{ filter: isInstalled ? 'none' : 'grayscale(0.9)'}}
        className="gameImg" />
      <div className="gameTitle">
        <span>{title}</span>
        <i
          className={`material-icons ${
            isInstalled ? "is-success" : "is-primary"
          }`}
        >
          {isInstalled ? "play_circle" : "get_app"}
        </i>
      </div>
    </Link>
  );
};

export default GameCard;
