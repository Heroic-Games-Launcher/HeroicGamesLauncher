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
    iconName: "get_app"
  };

  if( isInstalled ) {
    gameCardInfo.iconColor = "has-text-success";
    gameCardInfo.iconName = "play_circle";
  }

  return (
    <div className="gameCard card">
      <Link
        className="card-image"
        to={{  pathname: `/gameconfig/${appName}` }}
      >
        <figure className="image is-3by4">
          <img src={cover} alt={title}/>
        </figure>
      </Link>
      <div className="card-content gameInfo">
        <span>{title}</span>
        <i className={`icon is-medium ${gameCardInfo.iconColor}`}>
          <span className="material-icons">{gameCardInfo.iconName}</span>
        </i>
      </div>
    </div>



    // <Link
    //   className="gameCard"
    //   to={{
    //     pathname: `/gameconfig/${appName}`
    //   }}
    // >
    //   <img alt="cover-art" src={cover} className="gameImg" />
    //   <div className="gameTitle">
    //     <span>{title}</span>
    //     <i
    //       className={`material-icons ${
    //         isInstalled ? "is-success" : "is-primary"
    //       }`}
    //     >
    //       {isInstalled ? "play_circle" : "get_app"}
    //     </i>
    //   </div>
    // </Link>
  );
};

export default GameCard;
