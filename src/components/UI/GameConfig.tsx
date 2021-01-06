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
const { ipcRenderer } = window.require('electron')

interface Card {
  location: any;
}

export default function GameConfig({ location }: Card) {
  const [gameInfo, setGameInfo] = useState({} as any);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState('0')

  const { handleInstalling, refresh, installing } = React.useContext(ContextProvider)

  const { appName } = location.state || {};
  const currentApp = installing.filter(game => game === appName)
  const isInstalling = currentApp.length;

  useEffect(() => {
    const updateConfig = async () => {
      const newInfo = await getGameInfo(appName);
      setGameInfo(newInfo);
    }
    updateConfig()
  }, [isInstalling, appName]);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      if (isInstalling) {
        ipcRenderer.send('requestGameProgress', (appName))
        ipcRenderer.on('requestedOutput', (event: any, progress: string) => setProgress(progress))
      }
    }, 2000)
    return () => clearInterval(progressInterval)
  }, [isInstalling, appName, progress])

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
                  <div className="clickable" onClick={() => ipcRenderer.send('openFolder', install_path)} >Location: {install_path} (Click to Open Location)</div>
                  <br />
                </>
              )}
            </div>
            <div className="buttonsWrapper">
              {isInstalled && (
                <>
                  <div
                    onClick={async () => {
                      if (playing) {
                        return sendKill(appName)
                      }

                      setPlaying(true);
                      await legendary(`launch ${appName}`);
                      setPlaying(false);
                    }}
                    className="button is-primary"
                  >
                    {playing ? "Playing (Stop)" : "Play Now"}
                  </div>
                </>
              )}
              <div
                onClick={async () => {
                  if (isInstalling) {
                    handleInstalling(appName)
                    return sendKill(appName)
                  }

                  if (isInstalled){
                    return await legendary(`uninstall ${appName}`)
                  }
                  
                  handleInstalling(appName)                  
                  return await install(appName)
                }}
                className={`button ${
                  isInstalled ? "is-danger" : "is-success"
                }`}
              >
                {`${
                  isInstalled
                    ? "Uninstall"
                    : isInstalling
                    ? `${progress}% (Stop)`
                    : "Install"
                }`}
              </div>
              {/* <div
                onClick={() => createNewWindow(formatStoreUrl(title))}
                className="button is-empty"
              >
                Epic Store
              </div>
              <div
                onClick={() => createNewWindow(protonDBurl)}
                className="button is-empty"
              >
                ProtonDB
              </div> */}
            </div>
          </div>
        </div>
        </div>

      </>
    );
  }
  return null;
}
