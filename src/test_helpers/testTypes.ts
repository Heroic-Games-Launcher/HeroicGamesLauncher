/**
 * @file  Defines some property configs which are used in multiple tests
 *        If a new property config is needed it should be defined here.
 *        To create a new property config of a specific type the
 *        template class @see TestType<Type> should be used.
 *        Also don't forget to add the new config to @see resetTestTypes
 *        and export it.
 */

import { AppSettings, ContextType, GameInfo } from 'src/types';
import { WineInstallation } from './../types';
import { initElectronMocks } from 'src/test_helpers/mock/electron';

/**
 * A template class to define a new test type config.
 * The initial property values of given Type are needed.
 * Provides functionality of setting/getting property values
 * of the config.
 * @class TestType<Type>
 * @example
 * // custom Type
 * interface CustomType {
 *  value1: string
 *  value2: string
 * }
 * // create new test type instance of Type CustomType
 * const test_type =
 *  new TestType<CustomType>({value1: 'Hello '; value2: 'World'});
 */
class TestType<Type> {
  private default: Type;
  private actual: Type;

  /**
   * Constructor of template class TestType<Type>
   * @param props initial property values of Type
   */
  constructor(props: Type) {
    this.default = props;
    this.actual = this.default;
  }

  /**
   * Set property values of the test type.
   * @example
   * const test_type =
   *  new TestType<{value1: string; value2: string}>({value1: 'Hello ', value2: 'World'});
   * // should log 'Hello World'
   * console.log(test_type.get().value1 + test_type.get().value2);
   * // set value1
   * test_type.set({value1: 'Bye '});
   * // should log 'Bye World'
   * console.log(test_type.get().value1 + test_type.get().value2);
   * @param props the property values which should be set
   */
  public set(props: Partial<Type> = {})
  {
    if( typeof props === 'number' || typeof props === 'string')
    {
      this.actual = props;
    }
    else if(Array.isArray(props))
    {
      for(let i = 0; i < props.length; i++)
      {
        this.actual[i] = {...this.actual[i], ...props[i]};
      }
    }
    else
    {
      this.actual = {...this.actual, ...props};
    }
    initElectronMocks();
  }

  /**
   * Resets the test type to it's initial property values.
   * The inital value is set during the construction of the test type.
   * @example
   * const test_type =
   *  new TestType<{value1: string; value2: string}>({value1: 'Hello ', value2: 'World'});
   * // should log 'Hello World'
   * console.log(test_type.get().value1 + test_type.get().value2);
   * // set value1
   * test_type.set({value1: 'Bye '});
   * // should log 'Bye World'
   * console.log(test_type.get().value1 + test_type.get().value2);
   * // reset test type
   * test_type.reset();
   * // should log 'Hello World' again
   * console.log(test_type.get().value1 + test_type.get().value2);
   */
  public reset()
  {
    this.actual = this.default;
    initElectronMocks();
  }

  /**
   * Get all the test type property values.
   * @example
   * const test_type =
   *  new TestType<{value1: string; value2: string}>({value1: 'Hello ', value2: 'World'});
   * // print test type property values
   * console.log(test_type.get().value1 + test_type.get().value2);
   * @returns the property values of the test type
   */
  public get()
  {
    return this.actual;
  }
}

/**
 * Test type for a game of type GameInfo.
 * Can be used in tests to provide/manipulate a game config.
 */
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
      shortDescription: 'short description'
    },
    reqs: []
  },
  folder_name: 'folder_name',
  install: {
    executable: 'executable',
    install_path: 'install/path',
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

/**
 * Test type for a plugin of type GameInfo.
 * Can be used in tests to provide/manipulate a plugin config.
 */
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
      shortDescription: 'short description'
    },
    reqs: []
  },
  folder_name: 'folder_name',
  install: {
    executable: 'executable',
    install_path: 'install/path',
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
  save_folder: '{appdata}/../locallow',
  title: 'title'
});

/**
 * Test type for the app settings of type AppSettings.
 * Can be used in tests to provide/manipulate the app settings.
 */
const test_appsettings = new TestType<AppSettings>({
  addDesktopShortcuts: false,
  addStartMenuShortcuts: false,
  audioFix: false,
  autoInstallDxvk: false,
  autoSyncSaves: false,
  checkForUpdatesOnStartup: true,
  customWinePaths: ['custom/wine/path'],
  darkTrayIcon: false,
  defaultInstallPath: 'default/install/path',
  discordRPC: true,
  egsLinkedPath: 'egs/linked/path',
  exitToTray: false,
  language: 'en',
  launcherArgs: 'launcherArgs',
  maxRecentGames: 5,
  maxWorkers: 1,
  nvidiaPrime: false,
  offlineMode: false,
  otherOptions: 'otherOptions',
  savesPath: 'saves/path',
  showFps: false,
  showMangohud: false,
  startInTray: false,
  useGameMode: false,
  winePrefix: 'winePrefix',
  wineVersion: {
    bin: 'bin',
    name: 'wine'
  }
});

/**
 * Test type for the electron openDialog response.
 * Can be used in tests to provide/manipulate the response of
 * electron openDialog.
 */
const test_opendialog = new TestType<{canceled: boolean; path: string;}>({
  canceled: false,
  path: 'default/dialog/path'
});

/**
 * Test type for the electron openMessageBox response.
 * Can be used in tests to provide/manipulate the response of
 * electron openMessageBox.
 */
const test_openmessagebox_response = new TestType<number>(0);

/**
 * Test type for the electron invoke 'egsSync' response.
 * Can be used in tests to provide/manipulate the response of
 * electron invoke 'egsSync'.
 */
const test_egssync_response = new TestType<string>('Success');

/**
 * Test type for a wine installation of type WineInstallation.
 * Can be used in tests to provide/manipulate a wine installation config.
 */
const test_wineinstallations = new TestType<WineInstallation[]>([{
  bin: 'path/to/wine/bin',
  name: 'wine'
}]);

/**
 * Test type for electron invoke 'getUserInfo' response
 * Can be used in tests to provide/manipulate the response of
 * electron invoke 'getUserInfo'.
 */
const test_userinfo = new TestType<{
  account_id: string
  displayName: string
  epicId: string
  name: string}>({
    account_id: 'account_id',
    displayName: 'displayName',
    epicId: 'epicId',
    name: 'name'
  });

/**
 * Test type for the context of type ContextType.
 * Can be used in tests to provide/manipulate the context config.
 * This can be used together with the ContextProvider
 */
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

/**
 * Resets all defined test types to there initial property
 * values.
 */
function resetTestTypes()
{
  test_appsettings.reset();
  test_context.reset();
  test_egssync_response.reset();
  test_game.reset();
  test_opendialog.reset();
  test_openmessagebox_response.reset();
  test_plugin.reset();
  test_userinfo.reset();
  test_wineinstallations.reset();

  initElectronMocks();
}

export {
  resetTestTypes,
  test_appsettings,
  test_context,
  test_egssync_response,
  test_game,
  test_opendialog,
  test_openmessagebox_response,
  test_plugin,
  test_userinfo,
  test_wineinstallations
};
