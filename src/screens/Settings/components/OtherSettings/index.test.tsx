import React from 'react'

import { fireEvent, render } from '@testing-library/react'

import OtherSettings from './index'

interface Props {
  audioFix: boolean
  isDefault: boolean
  launcherArgs: string
  offlineMode: boolean
  otherOptions: string
  primeRun: boolean
  addDesktopShortcuts: boolean
  addGamesToStartMenu: boolean
  discordRPC: boolean
  setLauncherArgs: (value: string) => void
  setOtherOptions: (value: string) => void
  setTargetExe: (value: string) => void
  setMaxRecentGames: (value: number) => void
  showFps: boolean
  showMangohud: boolean
  maxRecentGames: number
  toggleAudioFix: () => void
  toggleFps: () => void
  toggleMangoHud: () => void
  toggleOffline: () => void
  togglePrimeRun: () => void
  toggleUseGameMode: () => void
  toggleAddDesktopShortcuts: () => void
  toggleAddGamesToStartMenu: () => void
  toggleDiscordRPC: () => void
  useGameMode: boolean
  targetExe: string
  isMacNative: boolean
}

function renderOtherSettings(props: Partial<Props> = {}) {
  const defaultprops: Props = {
    audioFix: false,
    isDefault: false,
    launcherArgs: 'launcherArgs',
    offlineMode: false,
    otherOptions: 'otherOptions',
    primeRun: false,
    maxRecentGames: 5,
    addDesktopShortcuts: false,
    addGamesToStartMenu: false,
    discordRPC: false,
    isMacNative: false,
    setLauncherArgs: (value: string) => value,
    setOtherOptions: (value: string) => value,
    setTargetExe: (value: string) => value,
    showFps: false,
    showMangohud: false,
    setMaxRecentGames: (value: number) => value,
    toggleAudioFix: () => {
      return
    },
    toggleFps: () => {
      return
    },
    toggleMangoHud: () => {
      return
    },
    toggleOffline: () => {
      return
    },
    togglePrimeRun: () => {
      return
    },
    toggleUseGameMode: () => {
      return
    },
    toggleAddDesktopShortcuts: () => {
      return
    },
    toggleDiscordRPC: () => {
      return
    },
    toggleAddGamesToStartMenu: () => {
      return
    },
    targetExe: 'Default',
    useGameMode: false
  }
  return render(<OtherSettings {...{ ...defaultprops, ...props }} />)
}

describe('OtherSettings', () => {
  test('renders', () => {
    renderOtherSettings()
  })

  test('change options on change', () => {
    const onSetOtherOptions = jest.fn()
    const { getByTestId } = renderOtherSettings({
      setOtherOptions: onSetOtherOptions
    })
    const otherOptions = getByTestId('otheroptions')
    fireEvent.change(otherOptions, { target: { value: 'new option' } })
    expect(onSetOtherOptions).toBeCalledWith('new option')
  })

  test('change max recent games', () => {
    const onSetMaxRecentGames = jest.fn()
    const { getByTestId } = renderOtherSettings({
      setMaxRecentGames: onSetMaxRecentGames,
      isDefault: true
    })
    const maxRecentGames = getByTestId('setMaxRecentGames')

    fireEvent.change(maxRecentGames, { target: { value: '10' } })
    expect(onSetMaxRecentGames).toBeCalledWith(10)
  })

  test('change launch args on change', () => {
    const onSetLauncherArgs = jest.fn()
    const { getByTestId } = renderOtherSettings({
      setLauncherArgs: onSetLauncherArgs
    })
    const launcherArgs = getByTestId('launcherargs')
    fireEvent.change(launcherArgs, { target: { value: '--new arg' } })
    expect(onSetLauncherArgs).toBeCalledWith('--new arg')
  })
})
