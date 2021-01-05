import React, { useState } from "react";
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

interface Card {
  location: any;
}

export default function GameConfig({ location }: Card) {
  const [gameInfo, setGameInfo] = useState({} as any);
  const [playing, setPlaying] = useState(false);
  const { handleInstalling, refresh, installing } = React.useContext(ContextProvider)
  
  const { appName } = location.state || {};
  const isInstalling = installing.filter(game => game.game === appName).length;
  // const { progress } = installing.filter(game => game.game === appName)[0];

  React.useEffect(() => {
    const updateConfig = async () => {
      const newInfo = await getGameInfo(appName);
      setGameInfo(newInfo);
    };
    updateConfig()
  }, [isInstalling, appName]);

  if (!appName) {
    return (
      <Header renderBackButton />
    );
  }

  // if (isInstalling) {
  //   console.log(progress.split('\n')[0].replace('%', ''));
  //   if (progress === 'end') {
  //     handleInstalling(appName);
  //     refresh()
  //   }
  // }

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
                  isInstalled ? "uninstall is-danger" : "is-success install"
                }`}
              >
                {`${
                  isInstalled
                    ? "Uninstall"
                    : isInstalling
                    ? `0% (Stop)`
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
        </div>

      </>
    );
  }
  return null;
}
