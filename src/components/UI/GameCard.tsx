import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ContextProvider from '../../state/ContextProvider';
const { ipcRenderer } = window.require("electron");
interface Card {
  cover: string;
  logo: string
  title: string;
  appName: string;
  isInstalled: boolean;
}


interface InstallProgress {
  percent: string
  bytes: string
}

const GameCard = ({ cover, title, appName, isInstalled, logo }: Card) => {
  const [progress, setProgress] = useState({ percent: '0.00%', bytes: '0/0MB' } as InstallProgress);

  const { installing } = useContext(ContextProvider);

  const isInstalling = Boolean(
    installing.filter((game) => game === appName).length
  );

  useEffect(() => {
    const progressInterval = setInterval(() => {
      if (isInstalling) {
        ipcRenderer.send("requestGameProgress", appName);
        ipcRenderer.on(`${appName}-progress`, (event: any, progress: InstallProgress) =>
          setProgress(progress)
        );
      }
    }, 1000);
    return () => clearInterval(progressInterval);
  }, [isInstalling, appName]);

  const { percent } = progress
  const effectPercent = isInstalling ? `${100 - Number(percent.replace('%', ''))}%` : '100%'
  
  return (
    <Link
      className="gameCard"
      to={{
        pathname: `/gameconfig/${appName}`
      }}
    >
      {isInstalling && <span className="progress">{percent}</span>}
      {logo &&
        <img 
        alt="logo" 
        src={logo} 
        style={{ filter: isInstalled ? 'none' : `grayscale(${effectPercent})`}}
        className="gameLogo" />
      }
      <img 
        alt="cover-art" 
        src={cover} 
        style={{ filter: isInstalled ? 'none' : `grayscale(${effectPercent})`}}
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
