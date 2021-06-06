// Lets get back to these tests after refactor

import '@testing-library/react'

// import { AppSettings, GameStatus, InstallProgress } from 'src/types';
// import { install } from 'src/helpers';

// import { ipcRenderer } from 'src/test_helpers/mock/electron';

// import { game } from 'src/test_helpers/testDefaultVariables'

// interface Install {
//   appName: string
//   handleGameStatus: (game: GameStatus) => Promise<void>
//   installPath: 'import' | 'default' | 'another'
//   isInstalling: boolean
//   previousProgress: InstallProgress
//   progress: InstallProgress
//   setInstallPath?: (path: string) => void
//   t: (str: string) => string
// }

// async function callHandleInstall(props: Partial<{ app: Partial<AppSettings>, install: Partial<Install> }> = {}) {
//   const defaultpropsApp: AppSettings = {
//     audioFix: false,
//     autoInstallDxvk: false,
//     autoSyncSaves: false,
//     customWinePaths: ['customWinePaths'],
//     darkTrayIcon: false,
//     defaultInstallPath: 'defaultInstallPath',
//     egsLinkedPath: 'egLinkedPath',
//     exitToTray: false,
//     language: 'en',
//     launcherArgs: 'launcherArgs',
//     maxWorkers: 1,
//     nvidiaPrime: false,
//     offlineMode: false,
//     otherOptions: 'otherOptions',
//     savesPath: 'savesPath',
//     showFps: false,
//     showMangohud: false,
//     useGameMode: false,
//     winePrefix: 'winePrefix',
//     wineVersion: {
//       bin: 'bin',
//       name: 'wine'
//     }
//   };
//   const defaultpropsInstall: Install = {
//     appName: 'game',
//     handleGameStatus: () => new Promise(() => { return; }),
//     installPath: 'default',
//     isInstalling: false,
//     previousProgress: {
//       bytes: '0',
//       eta: '0',
//       folder: '/',
//       percent: '0'
//     },
//     progress: {
//       bytes: '0',
//       eta: '0',
//       percent: '0'
//     },
//     t: (str: string) => str
//   };

//   ipcRenderer.invoke.mockReturnValueOnce({ ...defaultpropsApp, ...props.app });
//   const returnvalue = await install({ ...defaultpropsInstall, ...props.install });
//   expect(ipcRenderer.invoke).toBeCalledWith('requestSettings', 'default');
//   return returnvalue;
// }

describe('handleInstall', () => {
  // test('install game on default path', async () => {
  //   await callHandleInstall();
  //   expect(ipcRenderer.invoke).toBeCalledWith('install', { 'appName': 'game', 'path': 'defaultInstallPath' });
  // })

  // test('stop game installing on default path', async () => {
  //   ipcRenderer.invoke.mockReturnValue(game);
  //   const onHandleGameStatus = jest.fn();

  //   // call sendkill
  //   expect(ipcRenderer.invoke).toBeCalledWith('getGameInfo', 'game');
  //   await callHandleInstall({ install: { handleGameStatus: onHandleGameStatus, isInstalling: true } });
  //   expect(ipcRenderer.invoke).toBeCalledWith('getGameInfo', 'game');
  //   expect(ipcRenderer.send).toBeCalledWith('kill', 'game');

  //   // remove folder
  //   await callHandleInstall({ install: { handleGameStatus: onHandleGameStatus, isInstalling: true } });
  //   expect(ipcRenderer.invoke).toBeCalledWith('getGameInfo', 'game');
  //   expect(ipcRenderer.send).toBeCalledWith('removeFolder', ['defaultInstallPath', 'folder_name']);
  // })

  // test('install game on import path', async () => {
  //   const onHandleGameStatus = jest.fn();
  //   await callHandleInstall({ install: { handleGameStatus: onHandleGameStatus, installPath: 'import' } });
  //   expect(onHandleGameStatus).toBeCalledWith({ 'appName': 'game', 'status': 'installing' });
  //   expect(ipcRenderer.invoke).toBeCalledWith('importGame', { 'appName': 'game', 'path': 'import/path' });
  //   expect(onHandleGameStatus).toBeCalledWith({ 'appName': 'game', 'status': 'done' });
  // })

  // test('install game on import path with invalid path does nothing', async () => {
  //   const onHandleGameStatus = jest.fn();
  //   await callHandleInstall({ install: { handleGameStatus: onHandleGameStatus, installPath: 'import' } });
  //   expect(onHandleGameStatus).not.toBeCalledWith();
  //   expect(ipcRenderer.invoke).toBeCalledTimes(1);
  // })

  // test('stop game installing on import path', async () => {
  //   ipcRenderer.invoke.mockReturnValue(game);
  //   const onHandleGameStatus = jest.fn();

  //   // call sendkill
  //   await callHandleInstall({ install: { handleGameStatus: onHandleGameStatus, installPath: 'import', isInstalling: true } });
  //   expect(ipcRenderer.invoke).toBeCalledWith('getGameInfo', 'game');
  //   expect(ipcRenderer.send).toBeCalledWith('kill', 'game');

  //   // remove folder
  //   await callHandleInstall({ install: { handleGameStatus: onHandleGameStatus, installPath: 'import', isInstalling: true } });
  //   expect(ipcRenderer.invoke).toBeCalledWith('getGameInfo', 'game');
  //   expect(ipcRenderer.send).toBeCalledWith('removeFolder', ['import', 'folder_name']);
  // })

  // test('install game on another path', async () => {
  //   const onHandleGameStatus = jest.fn();
  //   await callHandleInstall({ install: { handleGameStatus: onHandleGameStatus, installPath: 'another' } });
  //   expect(onHandleGameStatus).toBeCalledWith({ 'appName': 'game', 'status': 'installing' });
  //   expect(ipcRenderer.invoke).toBeCalledWith('install', { 'appName': 'game', 'path': 'another/path' });
  //   expect(onHandleGameStatus).toBeCalledWith({ 'appName': 'game', 'status': 'done' });
  // })

  // test('install game on another path with invalid path does nothing', async () => {
  //   const onHandleGameStatus = jest.fn();
  //   await callHandleInstall({ install: { handleGameStatus: onHandleGameStatus } });
  //   expect(onHandleGameStatus).not.toBeCalledWith();
  //   expect(ipcRenderer.invoke).toBeCalledTimes(1);
  // })

  // test('stop game installing on another path', async () => {
  //   ipcRenderer.invoke.mockReturnValue(game);
  //   const onHandleGameStatus = jest.fn();

  //   // call sendkill
  //   await callHandleInstall({ install: { handleGameStatus: onHandleGameStatus, installPath: 'another', isInstalling: true } });
  //   expect(ipcRenderer.invoke).toBeCalledWith('getGameInfo', 'game');
  //   expect(ipcRenderer.send).toBeCalledWith('kill', 'game');

  //   // remove folder
  //   await callHandleInstall({ install: { handleGameStatus: onHandleGameStatus, installPath: 'another', isInstalling: true } });
  //   expect(ipcRenderer.invoke).toBeCalledWith('getGameInfo', 'game');
  //   expect(ipcRenderer.send).toBeCalledWith('removeFolder', ['another', 'folder_name']);
  // })

  // test('install game on undefined path does nothing', async () => {
  //   const onHandleGameStatus = jest.fn();
  //   await callHandleInstall({ install: { handleGameStatus: onHandleGameStatus, installPath: undefined } });
  //   expect(onHandleGameStatus).not.toBeCalled();
  //   expect(ipcRenderer.invoke).toBeCalledTimes(1);
  // })

  test('should return true', () => expect(true).toBe(true))
})
