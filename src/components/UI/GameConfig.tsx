import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  createNewWindow,
  formatStoreUrl,
  Game,
  getGameInfo,
  legendary,
  install,
  getLegendaryConfig,
  sendKill
} from "../../helper";
import Header from "./Header";
import "../../App.css";
const { ipcRenderer } = window.require('electron')

interface Card {
  location: any;
}

export default function GameConfig({ location }: Card) {
  const [gameInfo, setGameInfo] = useState({} as any);
  const [playing, setPlaying] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState('0');

  const { appName } = location.state || {};

  React.useEffect(() => {
    const updateConfig = async () => {
      const newInfo = await getGameInfo(appName);
      setGameInfo(newInfo);
    };
    updateConfig()
  }, [installing, appName]);

  if (!appName) {
    return (
      <div>
        <Link to={"/"}>Back to Library</Link>
      </div>
    );
  }

  if (installing) {
    console.log(progress.split('\n')[0].replace('%', ''));
    if (progress === 'end') {
      setInstalling(false)
      getLegendaryConfig()
    }
    ipcRenderer.on('requestedOutput', (event: any, arg: string) => setProgress(arg) )
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
        <div className="gameConfig">
          <img alt="cover-art" src={art_square} className="gameImg" />
          <div className="gameInfo">
            <div className="title">{title}</div>
            <div className="infoWrapper">
              <div className="developer">{developer}</div>
              <div>appName: {appName}</div>
              {isInstalled && (
                <>
                  <div>Executable: {executable}</div>
                  <div>Location: {install_path}</div>
                  <div>Size: {sizeInMB}MB</div>
                  <div>Version: {version}</div>
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
                        return sendKill()
                      }

                      setPlaying(true);
                      await legendary(`launch ${appName}`);
                      setPlaying(false);
                    }}
                    className="button is-primary"
                  >
                    {playing ? "Playing" : "Play"}
                  </div>
                </>
              )}
              <div
                onClick={async () => {
                  if (installing) {
                    return sendKill()
                  }

                  if (isInstalled){
                    setInstalling(true)
                    await legendary(`uninstall ${appName}`)
                    return setInstalling(false)
                  }
                  
                  setInstalling(true)
                  return await install(appName)
                }}
                className={`button ${
                  isInstalled ? "uninstall is-danger" : "is-success install"
                }`}
              >
                {`${
                  isInstalled
                    ? "Uninstall"
                    : installing
                    ? `${progress.split('\n')[0].replace('%', '')}% (Stop)`
                    : "Install"
                }`}
              </div>
              <div
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
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
  return null;
}
