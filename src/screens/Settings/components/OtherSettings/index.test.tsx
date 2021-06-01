import React from 'react';

import {
  fireEvent,
  render
} from '@testing-library/react';

import OtherSettings from './index';

jest.mock('react-i18next', () => ({
  // this mock makes sure any components using the translate hook can use it without a warning being shown
  useTranslation: () => {
    return {
      i18n: {
        changeLanguage: () => new Promise(() => {return;})
      },
      t: (str: string) => str
    };
  }
}));

interface Props {
    audioFix: boolean
    isDefault: boolean
    launcherArgs: string
    offlineMode: boolean
    otherOptions: string
    primeRun: boolean
    setLauncherArgs: (value: string) => void
    setOtherOptions: (value: string) => void
    showFps: boolean
    showMangohud: boolean
    toggleAudioFix: () => void
    toggleFps: () => void
    toggleMangoHud: () => void
    toggleOffline: () => void
    togglePrimeRun: () => void
    toggleUseGameMode: () => void
    useGameMode: boolean
  }

function renderOtherSettings(props: Partial<Props> = {})
{
  const defaultprops: Props = {
    audioFix: false,
    isDefault: false,
    launcherArgs: 'launcherArgs',
    offlineMode: false,
    otherOptions: 'otherOptions',
    primeRun: false,
    setLauncherArgs: (value: string) => value,
    setOtherOptions: (value: string) => value,
    showFps: false,
    showMangohud: false,
    toggleAudioFix: () => {return;},
    toggleFps: () => {return;},
    toggleMangoHud: () => {return;},
    toggleOffline: () => {return;},
    togglePrimeRun: () => {return;},
    toggleUseGameMode: () => {return;},
    useGameMode: false
  };
  return render(<OtherSettings {...{...defaultprops, ...props}} />);
}

describe('OtherSettings', () => {
  test('renders', () => {
    renderOtherSettings();
  })

  test('change options on change', () => {
    const onSetOtherOptions = jest.fn();
    const { getByTestId } = renderOtherSettings({setOtherOptions: onSetOtherOptions});
    const otherOptions = getByTestId('otheroptions');
    fireEvent.change(otherOptions, {target: { value: 'new option'}});
    expect(onSetOtherOptions).toBeCalledWith('new option');
  })

  test('change launch args on change', () => {
    const onSetLauncherArgs = jest.fn();
    const { getByTestId } = renderOtherSettings({setLauncherArgs: onSetLauncherArgs});
    const launcherArgs = getByTestId('launcherargs');
    fireEvent.change(launcherArgs, {target: { value: '--new arg'}});
    expect(onSetLauncherArgs).toBeCalledWith('--new arg');
  })
})
