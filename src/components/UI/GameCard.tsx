import React from "react";
import { Link } from "react-router-dom";

interface Card {
  cover: string;
  title: string;
  appName: string;
  isInstalled: boolean;
}

const GameCard = ({ cover, title, appName, isInstalled }: Card) => {

  let gameCardInfo = {
    iconColor: "has-text-primary",
    iconName: "mdi-cloud-download",
    cardClass: "is-grayscale"
  };

  if( isInstalled ) {
    gameCardInfo.iconColor = "has-text-success";
    gameCardInfo.iconName = "mdi-play-circle";
    gameCardInfo.cardClass = "";
  }

  return (
    <div className="gameCard card">
      <Link
        className="card-image"
        to={{  pathname: `/gameconfig/${appName}` }}
      >
        <figure className={`image is-3by4 ${gameCardInfo.cardClass}`}>
          <img src={cover} alt={title}/>
        </figure>
      </Link>
      <div className="card-content gameInfo">
        <span>{title}</span>
        <i className={`icon is-medium ${gameCardInfo.iconColor}`}>
          <span className={`mdi mdi-24px ${gameCardInfo.iconName}`}></span>
        </i>
      </div>
      <i className={`${!isInstalled ? "icon glanceStatus" : "is-hidden"} is-medium ${gameCardInfo.iconColor}`}>
          <span className={`mdi mdi-24px ${gameCardInfo.iconName}`}></span>
        </i>
    </div>
  );
};

export default GameCard;
