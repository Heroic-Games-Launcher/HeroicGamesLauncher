import React from "react";
import { Link } from "react-router-dom";
import { createNewWindow, formatStoreUrl, Game, getGameInfo, legendary } from "../../helper";

interface Card {
  location: any;
}

export default function GameConfig({ location }: Card) {
  const [gameInfo, setGameInfo] = React.useState({} as any);
  const [playing, setPlaying] = React.useState(false);
  const [installing, setInstalling] = React.useState(false);
  const { appName } = location.state;
  
  React.useEffect(() => {
    const updateConfig = async () => {
      const newInfo = await getGameInfo(appName);
      setGameInfo(newInfo);
    };
    updateConfig();
  }, [appName, installing]);
  
  
  if (!location) {
    return null;
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
      developer
    }: Game = gameInfo;
    const sizeInMB = Math.floor(install_size / 1024 / 1024);
    const protonDBurl = `https://www.protondb.com/search?q=${title}`

    return (
      <>
        <h1>
          {title}
        </h1>
        <div className="gameConfig">
          <img alt="cover-art" src={art_square} className="gameImg" />
          <div className="gameInfo">
            <div className="infoWrapper">
              <span>Installed: {`${isInstalled ? "Yes" : "No"}`}</span>
              <span>appName: {appName}</span>
              <div>Developer: {developer}</div>
              {isInstalled && (
                <>
                  <div>Executable: {executable}</div>
                  <div>Installed on: {install_path}</div>
                  <div>Install Size: {sizeInMB}MB</div>
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
                  setPlaying(true);
                  await legendary(`launch ${appName}`);
                  setPlaying(false);
                }}
                className="button"
                style={{ backgroundColor: "#0078F2" }}
                >
                  {playing ? "Playing" : "Play"}
                </div>
              <div onClick={() => legendary(`sync-saves ${appName}`)} className="button">Sync Saves</div>
              </>
              )}
              <div
                onClick={async () => {
                  setInstalling(true)
                  await legendary(
                    isInstalled
                    ? `uninstall ${appName}`
                    : `install ${appName}`
                    )
                  setInstalling(false)
                  }
                }
                className="button"
                style={{ backgroundColor: isInstalled ? "#F0183C" : "#0078F2" }}
              >
                {`${isInstalled ? "Uninstall" : installing ? "Installing" : "Install"}`}
              </div>
              <div className="button">Winetricks</div>
              <div onClick={() => createNewWindow(formatStoreUrl(title))} className="button">Epic Store</div>
              <div onClick={() => createNewWindow(protonDBurl)} className="button">ProtonDB</div>
            </div>
          </div>
        </div>
        <Link to={"/"}>Back to Library</Link>
      </>
    );
  }
  return null;
}
