import { AppSettings, GameInfo } from 'src/types';
import { initElectronMocks } from 'src/test_helpers/mock/electron';

// default game
const default_test_game: GameInfo = {
  app_name: 'game',
  art_cover: 'art_cover',
  art_logo: 'art_logo',
  art_square: 'art_square',
  cloud_save_enabled: false,
  compatible_apps: ['compatible_apps'],
  developer: 'developer',
  extra: {
    about: {
      description: 'description',
      shortDescription: 'shortDescription'
    },
    reqs: []
  },
  folder_name: 'folder_name',
  install: {
    executable: 'executable',
    install_path: 'install_path',
    install_size: 'install_size',
    is_dlc: false,
    version: 'version'
  },
  is_game: true,
  is_installed: false,
  is_ue_asset: false,
  is_ue_plugin: false,
  is_ue_project: false,
  namespace: null,
  save_folder: 'save_folder',
  title: 'title'
};

let test_game = default_test_game;

function setTestGame(props: Partial<GameInfo> = {})
{
  test_game = {...test_game, ...props};
  initElectronMocks();
}

// default plugin
const default_test_plugin: GameInfo = {
  app_name: 'plugin',
  art_cover: 'art_cover',
  art_logo: 'art_logo',
  art_square: 'art_square',
  cloud_save_enabled: false,
  compatible_apps: [],
  developer: 'developer',
  extra: {
    about: {
      description: 'description',
      shortDescription: 'shortDescription'
    },
    reqs: []
  },
  folder_name: 'folder_name',
  install: {
    executable: 'executable',
    install_path: 'install_path',
    install_size: 'install_size',
    is_dlc: false,
    version: 'version'
  },
  is_game: false,
  is_installed: true,
  is_ue_asset: true,
  is_ue_plugin: true,
  is_ue_project: true,
  namespace: null,
  save_folder: 'save_folder',
  title: 'title'
};

let test_plugin = default_test_plugin;

function setTestPlugin(props: Partial<GameInfo> = {})
{
  test_plugin = {...test_plugin, ...props};
  initElectronMocks();
}

// default app settings
const default_test_appsettings: AppSettings = {
  audioFix: false,
  autoInstallDxvk: false,
  autoSyncSaves: false,
  customWinePaths: ['customWinePaths'],
  darkTrayIcon: false,
  defaultInstallPath: 'defaultInstallPath',
  discordrpc: true,
  egsLinkedPath: 'egLinkedPath',
  exitToTray: false,
  language: 'en',
  launcherArgs: 'launcherArgs',
  maxWorkers: 1,
  nvidiaPrime: false,
  offlineMode: false,
  otherOptions: 'otherOptions',
  savesPath: 'savesPath',
  showFps: false,
  showMangohud: false,
  useGameMode: false,
  winePrefix: 'winePrefix',
  wineVersion: {
    bin: 'bin',
    name: 'wine'
  }
};

let test_appsettings = default_test_appsettings;

function setTestAppSettings(props: Partial<AppSettings> = {})
{
  test_appsettings = {...test_appsettings, ...props};
  initElectronMocks();
}

// default dialog
interface onOpenDialog {
  canceled: boolean;
  path: string;
}

const default_test_opendialog: onOpenDialog = {
  canceled: false,
  path: 'default/dialog/path'
};

let test_opendialog = default_test_opendialog;

function setTestOpenDialog(props: Partial<onOpenDialog> = {})
{
  test_opendialog = {...test_opendialog, ...props};
  initElectronMocks();
}

// default max cpus
const default_test_maxcpus = 1;

let test_maxcpus = default_test_maxcpus;

function setTestMaxCpus(cpus: number)
{
  test_maxcpus = cpus;
  initElectronMocks();
}

// default response
const default_test_openmessagebox_response = 0;

let test_openmessagebox_response = default_test_openmessagebox_response;

function setTestOpenMessageBoxResponse(response: number)
{
  test_openmessagebox_response = response;
  initElectronMocks();
}

// reset all types to default
function resetTestTypes()
{
  test_game = default_test_game;
  test_plugin = default_test_plugin;
  test_appsettings = default_test_appsettings;
  test_opendialog = default_test_opendialog;
  test_maxcpus = default_test_maxcpus;
  test_openmessagebox_response = default_test_openmessagebox_response;
}

export {
  resetTestTypes,
  setTestAppSettings,
  setTestGame,
  setTestMaxCpus,
  setTestOpenDialog,
  setTestOpenMessageBoxResponse,
  setTestPlugin,
  test_appsettings,
  test_game,
  test_maxcpus,
  test_opendialog,
  test_openmessagebox_response,
  test_plugin
};
