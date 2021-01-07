import React, { useEffect, useState } from "react";
import {
  createNewWindow,
  formatStoreUrl,
  getGameInfo,
  legendary,
  install,
  sendKill
} from "../../helper";
import Header from "./Header";
import "../../App.css";
import { Game } from '../../types';
import ContextProvider from '../../state/ContextProvider';
const { ipcRenderer, remote } = window.require('electron');
const {dialog: { showOpenDialog }} = remote

interface Card {
  location: any;
}

// This component is becoming really complex and it needs to be refactored in smaller ones

export default function GameConfig({ location }: Card) {
  const [gameInfo, setGameInfo] = useState({} as any);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState('0.00')
  const [uninstalling, setUninstalling] = useState(false)

  const { handleInstalling, refresh, installing } = React.useContext(ContextProvider)

  const { appName } = location.state || {};
  const currentApp = installing.filter(game => game === appName)
  const isInstalling = Boolean(currentApp.length);

  useEffect(() => {
    const updateConfig = async () => {
      const newInfo = await getGameInfo(appName);
      setGameInfo(newInfo);
    }
    updateConfig()
  }, [isInstalling, appName, uninstalling]);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      if (isInstalling) {
        ipcRenderer.send('requestGameProgress', (appName))
        ipcRenderer.on('requestedOutput', (event: any, progress: string) => setProgress(progress))
      }
    }, 2000)
    return () => clearInterval(progressInterval)
  }, [isInstalling, appName])

  if (!appName) {
    return (
      <Header renderBackButton />
    );
  }

  if (isInstalling) {
    if (progress === '100') {
      handleInstalling(appName);
      refresh()
    }
  }

  if (gameInfo) {
    const {
      title,
      art_square,
      install_path,
      install_size,
      isInstalled,
      executable,
      version,
      developer,
    }: Game = gameInfo;
    const sizeInMB = Math.floor(install_size / 1024 / 1024);
    const protonDBurl = `https://www.protondb.com/search?q=${title}`;

    return (
      <>
        <Header renderBackButton />
        <div className="gameConfigContainer">
          <span className="material-icons is-secondary dots">more_vertical</span>
        <div className="more">
          <span className="hidden linkTitle">External Links</span>
          <span onClick={() => createNewWindow(formatStoreUrl(title))} className="hidden link">Epic Games</span>
          <span onClick={() => createNewWindow(protonDBurl)} className="hidden link">Check Compatibility</span>
        </div>
        <div className="gameConfig">
          <img alt="cover-art" src={art_square} className="gameImg" />
          <div className="gameInfo">
            <div className="title">{title}</div>
            <div className="infoWrapper">
              <div className="developer">{developer}</div>
              {isInstalled && (
                <>
                  <div>Executable: {executable}</div>
                  <div>Size: {sizeInMB}MB</div>
                  <div>Version: {version}</div>
                  <div 
                    className="clickable" 
                    onClick={() => ipcRenderer.send('openFolder', install_path)} >Location: {install_path} (Click to Open Location)
                  </div>
                  <br />
                </>
              )}
            </div>
            <div className="gameStatus">
              {isInstalling && <progress className="installProgress" max={100} value={progress} />}
              <p style={ {fontStyle: 'italic', color: (isInstalled || isInstalling) ? '#0BD58C' : '#BD0A0A'}} >{
                isInstalling ? `Installing ${progress}%` : isInstalled ? "Installed" : "This game is not installed"
              }</p>
            </div>
            <div className="buttonsWrapper">
              {isInstalled && (
                <>
                  <div
                    onClick={handlePlay()}
                    className="button is-success"
                  >
                    {playing ? "Playing (Stop)" : "Play Now"}
                  </div>
                </>
              )}
              <div
                onClick={handleInstall(isInstalled)}
                className={`button ${
                  isInstalled ? "is-danger" : isInstalling ? "is-danger" : "is-primary"
                }`}
              >
                {`${
                  isInstalled
                    ? "Uninstall"
                    : isInstalling
                    ? `Cancel`
                    : "Install"
                }`}
              </div>
            </div>
          </div>
        </div>
        </div>
      </>
    );
  }
  return null;

  function handlePlay(): ((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void) | undefined {
    return async () => {
      if (playing) {
        return sendKill(appName);
      }

      setPlaying(true);
      await legendary(`launch ${appName}`);
      setPlaying(false);
    };
  }

  function handleInstall(isInstalled: boolean): ((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void) | undefined {
    return async () => {
      if (isInstalling) {
        handleInstalling(appName);
        return sendKill(appName);
      }

      if (isInstalled) {
        setUninstalling(true);
        await legendary(`uninstall ${appName}`);
        return setUninstalling(false);
      }

      const { filePaths } = await showOpenDialog({
        title: "Choose Install Path",
        buttonLabel: "Choose",
        properties: ["openDirectory"],
      });

      if (filePaths[0]) {
        const path = filePaths[0];
        handleInstalling(appName);
        await install({ appName, path });
        handleInstalling(appName);
      }
    };
  }
}
