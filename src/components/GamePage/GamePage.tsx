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
  syncSaves,
  updateGame,
} from "../../helper";
import Header from "../UI/Header";
import "../../App.css";
import { AppSettings, Game } from "../../types";
import ContextProvider from "../../state/ContextProvider";
import { Link, useParams } from "react-router-dom";
import Update from "../UI/Update";
const { ipcRenderer, remote } = window.require("electron");
const {
  dialog: { showOpenDialog, showMessageBox },
} = remote;

// This component is becoming really complex and it needs to be refactored in smaller ones

interface RouteParams {
  appName: string;
}

interface InstallProgress {
  percent: string
  bytes: string
}

export default function GamePage() {
  const { appName } = useParams() as RouteParams;

  const {
    handleInstalling,
    handlePlaying,
    refresh,
    installing,
    playing,
  } = useContext(ContextProvider);

  const [gameInfo, setGameInfo] = useState({} as Game);
  const [progress, setProgress] = useState({ percent: '0.00%', bytes: '0/0MB' } as InstallProgress);
  const [uninstalling, setUninstalling] = useState(false);
  const [installPath, setInstallPath] = useState("default");
  const [autoSyncSaves, setAutoSyncSaves] = useState(false)
  const [savesPath, setSavesPath] = useState("")
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const isInstalling = Boolean(
    installing.filter((game) => game === appName).length
  );

  const isPlaying = playing.filter((game) => game.appName === appName)[0]?.status;

  useEffect(() => {
    const updateConfig = async () => {
      const newInfo = await getGameInfo(appName);
      setGameInfo(newInfo);
      if (newInfo.cloudSaveEnabled) {
        ipcRenderer.send("requestSettings", appName);
        ipcRenderer.once(appName, (event, {autoSyncSaves, savesPath}: AppSettings) => {
          setAutoSyncSaves(autoSyncSaves)
          setSavesPath(savesPath)
        })
      }
    };
    updateConfig();
  }, [isInstalling, isPlaying, appName, uninstalling, playing]);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      if (isInstalling || isUpdating) {
        ipcRenderer.send("requestGameProgress", appName);
        ipcRenderer.on(`${appName}-progress`, (event: any, progress: InstallProgress) =>
          setProgress(progress)
        );
      }
    }, 1000);
    return () => clearInterval(progressInterval);
  }, [isInstalling, appName, isUpdating]);
  
  if (gameInfo) {
    const {
      title,
      art_square,
      art_logo,
      install_path,
      install_size,
      isInstalled,
      executable,
      version,
      extraInfo,
      developer,
      cloudSaveEnabled,
      saveFolder
    }: Game = gameInfo;

    const protonDBurl = `https://www.protondb.com/search?q=${title}`;

    return (
      <>
        <Header goTo={'/'} renderBackButton />
        <div className="gameConfigContainer">
          {title ? (
            <>
              <span className="material-icons is-secondary dots">
                more_vertical
              </span>
              <div className="more">
                {isInstalled && (
                  <Link
                    className="hidden link"
                    to={{
                      pathname: `/settings/${appName}/wine`,
                    }}
                  >
                    Settings
                  </Link>
                )}
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
              {isInstalled && <span
                  onClick={() => ipcRenderer.send('getLog', appName)}
                  className="hidden link"
                >
                  Latest Log
                </span>}
              </div>
              <div className="gameConfig">
                <div className="gamePicture">
                  <img alt="cover-art" src={art_square} className="gameImg" />
                  {art_logo && <img alt="cover-art" src={art_logo} className="gameLogo" />}
                </div>
                <div className="gameInfo">
                  <div className="title">{title}</div>
                  <div className="infoWrapper">
                    <div className="developer">{developer}</div>
                    <div className="summary">
                      {extraInfo ? extraInfo.shortDescription : ""}
                    </div>
                    <div style={{color: cloudSaveEnabled ? '#07C5EF' : '#5A5E5F'}}>
                      Cloud Save Sync: {cloudSaveEnabled ? `Supports (${autoSyncSaves ? 'Auto Sync Enabled' : 'Auto Sync Disabled'})` :  'Does not support'}
                    </div>
                    {cloudSaveEnabled && 
                    <div>
                      {`Cloud Sync Folder: ${saveFolder}`}
                    </div>}
                    {isInstalled && (
                      <>
                        <div>Executable: {executable}</div>
                        <div>Size: {install_size}</div>
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
                        value={Number(progress.percent.replace('%', ''))}
                      />
                    )}
                    <p
                      style={{
                        fontStyle: "italic",
                        color:
                          isInstalled || isInstalling ? "#0BD58C" : "#BD0A0A",
                      }}
                    >
                      {getInstallLabel(isInstalled, isUpdating)}
                    </p>
                  </div>
                  {(!isInstalled && !isInstalling) && (
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
                            getPlayBtnClass()
                          }`}
                        >
                          {getPlayLabel()}
                        </div>
                      </>
                    )}
                    <button
                      onClick={handleInstall(isInstalled)}
                      disabled={isPlaying || isUpdating}
                      className={`button ${getButtonClass(isInstalled)}`}
                    >
                      {`${getButtonLabel(isInstalled)}`}
                    </button>
                  </div>
                </div>
              </div>{" "}
            </>
          ) : (
            <Update />
          )}
        </div>
      </>
    );
  }
  return null;

  function getPlayBtnClass() {
    if (isUpdating){
      return 'is-danger'
    }
    if (isSyncing){
      return "is-primary"
    }
    return isPlaying ? "is-tertiary" : "is-success";
  }

  function getPlayLabel(): React.ReactNode {
    if (isUpdating){
      return 'Cancel Update'
    }
    if (isSyncing){
      return "Syncinc Saves"
    }

    return isPlaying ? "Playing (Stop)" : "Play Now";
  }

  function getInstallLabel(isInstalled: boolean, isUpdating: boolean): React.ReactNode {
    if (isUpdating) {
      return `Updating ${progress.percent ? `${progress.percent} - ${progress.bytes}` : '...'}`
    }

    if (isInstalling) {
      return `Installing ${progress.percent ? `${progress.percent} - ${progress.bytes}` : '...'}`
    }

    if (isInstalled){
      return 'Installed'
    }

    return "This game is not installed";
  }

  function getButtonClass(isInstalled: boolean) {
    if (isInstalled || isInstalling){
      return 'is-danger'
    }
    return 'is-primary'
  }

  function getButtonLabel(isInstalled: boolean) {
    if (installPath === 'import') {
      return 'Import'
    }
    if (isInstalled){
      return "Uninstall"
    }
    if (isInstalling) {
      return 'Cancel'
    }
    return 'Install'
  }

  function handlePlay():
    | ((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void)
    | undefined {
    return async () => {
      if (isPlaying || isUpdating) {
        handlePlaying({appName, status: false})
        return sendKill(appName);
      }

      if (autoSyncSaves){
        setIsSyncing(true)
        await syncSaves(savesPath, appName)
        setIsSyncing(false)
      }
      
      handlePlaying({appName, status: true})
      await launch(appName)
        .then(async (err) => {
          if (!err){
            return
          }
          if (err.includes('ERROR: Game is out of date')) {
            const { response } = await showMessageBox({
              title: "Game Needs Update",
              message: "This game has an update, do you wish to update now?",
              buttons: ["YES", "NO" ],
            });

            if (response === 0){
              console.log('Updating Game...');
              setIsUpdating(true)
              await updateGame(appName)
              setIsUpdating(false)

              const { response } = await showMessageBox({
                title: "Game Updated!",
                message: "Continuing launching?",
                buttons: ["YES", "NO"],
              });
              if (response === 0){
                handlePlaying({appName, status: true})
                await launch(appName)
                return handlePlaying({appName, status: false})
              }
              return
            }
            handlePlaying({appName, status: true})
            await launch(`${appName} --skip-version-check`)
            handlePlaying({appName, status: false})
          }
        })
      
      if (autoSyncSaves){
        setIsSyncing(true)
        await syncSaves(savesPath, appName)
        setIsSyncing(false)
      }
      
      return handlePlaying({appName, status: false})
    };
  }

  function handleInstall(isInstalled: boolean): any {
    return async () => {
      if (isInstalling) {
        return sendKill(appName);
      }

      if (isInstalled) {
        setUninstalling(true);
        await legendary(`uninstall ${appName}`);
        setUninstalling(false);
        return refresh();
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
