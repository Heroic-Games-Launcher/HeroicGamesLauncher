import { resetAllWhenMocks, when} from 'jest-when';
import {
  test_appsettings,
  test_egssync_response,
  test_game,
  test_maxcpus,
  test_opendialog,
  test_openmessagebox_response,
  test_platform,
  test_plugin,
  test_userinfo,
  test_wineinstallation
} from 'src/test_helpers/testTypes';

const stringAtIndex = (index: number, expect: string): boolean => when.allArgs((args: string): boolean => args[index] === expect);

export function initElectronMocks()
{
  resetAllWhenMocks();
  when(ipcRenderer.invoke)
    .calledWith('requestSettings', 'default').mockResolvedValue(test_appsettings.get())
    .calledWith(stringAtIndex(0, 'openDialog')).mockResolvedValue(test_opendialog.get())
    .calledWith('getGameInfo', test_game.get().app_name).mockResolvedValue(test_game.get())
    .calledWith('getGameInfo', test_plugin.get().app_name).mockResolvedValue(test_plugin.get())
    .calledWith('getUserInfo').mockResolvedValue({...test_userinfo.get(), user: 'user'})
    .calledWith('getPlatform').mockResolvedValue(test_platform.get())
    .calledWith('getMaxCpus').mockResolvedValue(test_maxcpus.get())
    .calledWith(stringAtIndex(0, 'egsSync')).mockResolvedValue(test_egssync_response.get())
    .calledWith('getAlternativeWine').mockResolvedValue(test_wineinstallation.get())
    .calledWith(stringAtIndex(0, 'openMessageBox')).mockResolvedValue({response: test_openmessagebox_response.get()})
    .calledWith(stringAtIndex(0, 'syncSaves')).mockResolvedValue('success');
}

export const ipcRenderer = {
  invoke: jest.fn(),
  send: jest.fn()
};




