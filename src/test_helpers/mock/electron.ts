/**
 * @file  Mock of electron.ts
 *        This defines how the calls to the backend (electron)
 *        should be mocked. Means how certained calls are resolved.
 *        If new calls to the backend are inserted in the frontend
 *        they should be resolved here within @see initElectronMocks.
 *        To solve this calls, we using {@link https://github.com/timkindberg/jest-when | jest-when}
 */
import { resetAllWhenMocks, when} from 'jest-when';
import {
  test_appsettings,
  test_context,
  test_egssync_response,
  test_game,
  test_opendialog,
  test_openmessagebox_response,
  test_plugin,
  test_userinfo,
  test_wineinstallations
} from 'src/test_helpers/testTypes';

/**
 * A string matcher for @see when().calledWith()
 * @param index   the index of the argument to match against
 * @param expect  the expected string
 * @returns       true if argument at index matches expect
 */
const stringAtIndex = (index: number, expect: string)
  : boolean => when.allArgs((args: string): boolean => args[index] === expect);

/**
 * Initialize all electron mocks with there values to resolve with on call.
 * If you change any instance of @see TestTypes<Type> with the @see TestType<Type>.set()
 * method this will be called, because the mock doesn't store the reference to
 * the property instead it stores the value it has at the time the mock is setup
 * by @see when().calledWith() .
 */
export function initElectronMocks()
{
  // reset all old mocks
  resetAllWhenMocks();

  // setup mocks for ipcRenderer.invoke
  when(ipcRenderer.invoke)
    .calledWith(stringAtIndex(0, 'requestSettings')).mockResolvedValue(test_appsettings.get())
    .calledWith(stringAtIndex(0, 'openDialog')).mockResolvedValue(test_opendialog.get())
    .calledWith('getGameInfo', test_game.get().app_name).mockResolvedValue(test_game.get())
    .calledWith('getGameInfo', test_plugin.get().app_name).mockResolvedValue(test_plugin.get())
    .calledWith('getUserInfo').mockResolvedValue({...test_userinfo.get(), user: 'user'})
    .calledWith('getPlatform').mockResolvedValue(test_context.get().platform)
    .calledWith('getMaxCpus').mockResolvedValue(1)
    .calledWith(stringAtIndex(0, 'egsSync')).mockResolvedValue(test_egssync_response.get())
    .calledWith('getAlternativeWine').mockResolvedValue(test_wineinstallations.get())
    .calledWith(stringAtIndex(0, 'openMessageBox')).mockResolvedValue(
      {response: test_openmessagebox_response.get()})
    .calledWith(stringAtIndex(0, 'syncSaves')).mockResolvedValue('success')
    .calledWith(stringAtIndex(0, 'writeConfig')).mockResolvedValue({})
    .calledWith(stringAtIndex(0, 'callTool')).mockResolvedValue({})
    .calledWith(stringAtIndex(0, 'requestFreeProducts')).mockResolvedValue({});

  // setup mocks for ipcRenderer.removeAllListeners
  when(ipcRenderer.removeAllListeners).calledWith('requestSettings').mockResolvedValue({});
}

export const ipcRenderer = {
  invoke: jest.fn(),
  removeAllListeners: jest.fn(),
  send: jest.fn()
};



