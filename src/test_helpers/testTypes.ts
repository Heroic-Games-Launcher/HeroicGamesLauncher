import { AppSettings, ContextType, GameInfo } from 'src/types';
import { WineInstallation } from './../types';
import { initElectronMocks } from 'src/test_helpers/mock/electron';

// template class to define test types
class TestType<Type> {
  private default: Type;
  private actual: Type;

  constructor(props: Type) {
    this.default = props;
    this.actual = this.default;
  }

  public set(props: Partial<Type> = {})
  {
    if( typeof props === 'number' || typeof props === 'string')
    {
      this.actual = props;
    }
    else
    {
      this.actual = {...this.actual, ...props};
    }
    initElectronMocks();
  }

  public reset()
  {
    this.actual = this.default;
    initElectronMocks();
  }

  public get()
  {
    return this.actual;
  }
}

// test game
const test_game = new TestType<GameInfo>({
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
  save_folder: '{appdata}/../locallow',
  title: 'title'
});

// test plugin
const test_plugin = new TestType<GameInfo>({
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
});

// test app settings
const test_appsettings = new TestType<AppSettings>({
  audioFix: false,
  autoInstallDxvk: false,
  autoSyncSaves: false,
  customWinePaths: ['customWinePaths'],
  darkTrayIcon: false,
  defaultInstallPath: 'defaultInstallPath',
  discordRPC: true,
  egsLinkedPath: 'egLinkedPath',
  exitToTray: false,
  language: 'en',
  launcherArgs: 'launcherArgs',
  maxRecentGames: 5,
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
});

// test dialog
interface onOpenDialog {
  canceled: boolean;
  path: string;
}

const test_opendialog = new TestType<onOpenDialog>({
  canceled: false,
  path: 'default/dialog/path'
});

// test max cpus
const test_maxcpus = new TestType<number>(1);

// test response
const test_openmessagebox_response = new TestType<number>(0);

// test egssync response
const test_egssync_response = new TestType<string>('Success');

// test wine installation
const test_wineinstallation = new TestType<WineInstallation>({
  bin: 'path/to/wine/bin',
  name: 'wine'
});

// test user info
interface UserInfo {
  account_id?: string
  displayName?: string
  epicId?: string
  name?: string
}

const test_userinfo = new TestType<UserInfo>({
  account_id: 'account_id',
  displayName: 'displayName',
  epicId: 'epicId',
  name: 'name'
});

// test context
const test_context = new TestType<ContextType>({
  category: 'games',
  data: [],
  error: false,
  filter: 'all',
  gameUpdates: [],
  handleCategory: () => { return; },
  handleFilter: () => { return; },
  handleGameStatus: () => Promise.resolve(),
  handleLayout: () => { return; },
  handleSearch: () => { return; },
  layout: 'grid',
  libraryStatus: [],
  platform: 'linux',
  refresh: () => Promise.resolve(),
  refreshLibrary: () => Promise.resolve(),
  refreshing: false,
  user: 'user'
})

// reset all types to default
function resetTestTypes()
{
  test_appsettings.reset();
  test_context.reset();
  test_egssync_response.reset();
  test_game.reset();
  test_maxcpus.reset();
  test_opendialog.reset();
  test_openmessagebox_response.reset();
  test_plugin.reset();
  test_userinfo.reset();
  test_wineinstallation.reset();
}

export {
  resetTestTypes,
  test_appsettings,
  test_context,
  test_egssync_response,
  test_game,
  test_maxcpus,
  test_opendialog,
  test_openmessagebox_response,
  test_plugin,
  test_userinfo,
  test_wineinstallation
};
