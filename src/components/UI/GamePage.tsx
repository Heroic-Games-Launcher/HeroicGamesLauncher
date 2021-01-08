import React, { useContext, useEffect, useState } from "react";
import {
  createNewWindow,
  formatStoreUrl,
  getGameInfo,
  legendary,
  install,
  sendKill,
  importGame,
  launch,
} from "../../helper";
import Header from "./Header";
import "../../App.css";
import { Game } from "../../types";
import ContextProvider from "../../state/ContextProvider";
import { Link, useParams } from "react-router-dom";
import Update from "./Update";
const { ipcRenderer, remote } = window.require("electron");
const {
  dialog: { showOpenDialog },
} = remote;

// This component is becoming really complex and it needs to be refactored in smaller ones
interface Card {
  location: any;
}

interface RouteParams {
  appName: string;
}

export default function GamePage({ location }: Card) {
  const [gameInfo, setGameInfo] = useState({} as Game);
  const [progress, setProgress] = useState("0.00");
  const [uninstalling, setUninstalling] = useState(false);
  const [installPath, setInstallPath] = useState("default");

  const {
    handleInstalling,
    handlePlaying,
    refresh,
    installing,
    playing,
  } = useContext(ContextProvider);

  const { appName } = useParams() as RouteParams;

  const isInstalling = Boolean(
    installing.filter((game) => game === appName).length
  );
  const isPlaying = Boolean(playing.filter((game) => game === appName).length);

  useEffect(() => {
    const updateConfig = async () => {
      const newInfo = await getGameInfo(appName);
      setGameInfo(newInfo);
    };
    updateConfig();
  }, [isInstalling, isPlaying, appName, uninstalling]);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      if (isInstalling) {
        ipcRenderer.send("requestGameProgress", appName);
        ipcRenderer.on("requestedOutput", (event: any, progress: string) =>
          setProgress(progress)
        );
      }
    }, 2000);
    return () => clearInterval(progressInterval);
  }, [isInstalling, appName]);

  if (isInstalling) {
    if (progress === "100") {
      handleInstalling(appName);
      refresh();
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
      extraInfo,
      developer,
    }: Game = gameInfo;
    
    const sizeInMB = Math.floor(install_size / 1024 / 1024);
    const protonDBurl = `https://www.protondb.com/search?q=${title}`;

    return (
      <>
        <Header renderBackButton />
        <div className="gameConfigContainer">
          {
            title ? 
            <>
            <span className="material-icons is-secondary dots">
            more_vertical
          </span>
          <div className="more">
            {isInstalled && <Link className="hidden link" to={{
               pathname: `/settings/${appName}`
            }}>
              Settings
            </Link>}
            <span
              onClick={() => createNewWindow(formatStoreUrl(title))}
              className="hidden link"
              >
              Epic Games
            </span>
            <span
              onClick={() => createNewWindow(protonDBurl)}
              className="hidden link"
              >
              Check Compatibility
            </span>
          </div>
          <div className="gameConfig">
            <img alt="cover-art" src={art_square} className="gameImg" />
            <div className="gameInfo">
              <div className="title">{title}</div>
              <div className="infoWrapper">
                <div className="developer">{developer}</div>
                <div className="summary">{ extraInfo ? extraInfo.summary : ''}</div>
                {isInstalled && (
                  <>
                    <div>Executable: {executable}</div>
                    <div>Size: {sizeInMB}MB</div>
                    <div>Version: {version}</div>
                    <div
                      className="clickable"
                      onClick={() =>
                        ipcRenderer.send("openFolder", install_path)
                      }
                      >
                      Location: {install_path} (Click to Open Location)
                    </div>
                    <br />
                  </>
                )}
              </div>
              <div className="gameStatus">
                {isInstalling && (
                  <progress
                  className="installProgress"
                  max={100}
                  value={progress}
                  />
                  )}
                <p
                  style={{
                    fontStyle: "italic",
                    color: isInstalled || isInstalling ? "#0BD58C" : "#BD0A0A",
                  }}
                  >
                  {isInstalling
                    ? `Installing ${progress}%`
                    : isInstalled
                    ? "Installed"
                    : "This game is not installed"}
                </p>
              </div>
              {!isInstalled && (
                <select
                onChange={(event) => setInstallPath(event.target.value)}
                value={installPath}
                className="settingSelect"
                >
                  <option value={"default"}>Install on default Path</option>
                  <option value={"another"}>Install on another Path</option>
                  <option value={"import"}>Import Game</option>
                </select>
              )}
              <div className="buttonsWrapper">
                {isInstalled && (
                  <>
                    <div
                      onClick={handlePlay()}
                      className={`button ${
                        isPlaying ? "is-tertiary" : "is-success"
                      }`}
                      >
                      {isPlaying ? "Playing (Stop)" : "Play Now"}
                    </div>
                  </>
                )}
                <button
                  onClick={handleInstall(isInstalled)}
                  disabled={isPlaying}
                  className={`button ${
                    isInstalled
                    ? "is-danger"
                    : isInstalling
                    ? "is-danger"
                    : "is-primary"
                  }`}
                  >
                  {`${
                    isInstalled
                    ? "Uninstall"
                    : isInstalling
                    ? `Cancel`
                    : "Install"
                  }`}
                </button>
              </div>
            </div>
            </div> </>: <Update />
      }
          </div>
        </>
        );
      }
      return null;
      
      function handlePlay():
      | ((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void)
    | undefined {
    return async () => {
      if (isPlaying) {
        return sendKill(appName);
      }

      handlePlaying(appName);
      await launch(appName);
      handlePlaying(appName);
    };
  }

  function handleInstall(isInstalled: boolean): any {
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

      if (installPath === "default") {
        const path = "default";
        handleInstalling(appName);
        await install({ appName, path });
        return handleInstalling(appName);
      }

      if (installPath === "import") {
        const { filePaths } = await showOpenDialog({
          title: "Choose Game Folder to import",
          buttonLabel: "Choose",
          properties: ["openDirectory"],
        });

        if (filePaths[0]) {
          const path = filePaths[0];
          handleInstalling(appName);
          await importGame({ appName, path });
          return handleInstalling(appName);
        }
      }

      if (installPath === "another") {
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
      }
    };
  }
}
