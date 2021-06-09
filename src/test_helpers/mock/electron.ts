import { resetAllWhenMocks, when} from 'jest-when';
import {
  test_appsettings,
  test_game,
  test_opendialog,
  test_openmessagebox_response,
  test_plugin
} from 'src/test_helpers/testTypes';

const stringAtIndex = (index: number, expect: string): boolean => when.allArgs((args: string): boolean => args[index] === expect);

export function initElectronMocks()
{
  resetAllWhenMocks();
  when(ipcRenderer.invoke)
    .calledWith('requestSettings', 'default').mockResolvedValue(test_appsettings)
    .calledWith(stringAtIndex(0, 'openDialog')).mockResolvedValue(test_opendialog)
    .calledWith('getGameInfo', test_game.app_name).mockResolvedValue(test_game)
    .calledWith('getGameInfo', test_plugin.app_name).mockResolvedValue(test_plugin)
    .calledWith(stringAtIndex(0, 'openMessageBox')).mockResolvedValue({response: test_openmessagebox_response});
}

export const ipcRenderer = {
  invoke: jest.fn(),
  send: jest.fn()
};




