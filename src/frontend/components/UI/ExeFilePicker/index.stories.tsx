import { useContext, useEffect } from 'react'
import { expect, screen } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { GameInfo, Runner } from 'common/types'

import ExeFilePicker from '.'
import ContextProvider from 'frontend/state/ContextProvider'
import useGlobalState from 'frontend/state/GlobalStateV2'

const mockGames: GameInfo[] = [
  {
    app_name: 'game-one',
    title: 'Game One',
    runner: 'legendary' as Runner,
    is_installed: true,
    canRunOffline: true,
    art_cover: 'icon.png',
    art_square: 'icon.png',
    install: {}
  },
  {
    app_name: 'game-two',
    title: 'Game Two',
    runner: 'gog' as Runner,
    is_installed: true,
    canRunOffline: true,
    art_cover: 'icon.png',
    art_square: 'icon.png',
    install: {}
  }
]

const meta = {
  title: 'Overlays/ExeFilePicker',
  component: ExeFilePicker,
  parameters: {
    docs: {
      story: { inline: false, height: '480px' },
      description: {
        component:
          'Modal shown when a Windows executable is opened with Heroic. The dialog is driven by the GlobalStateV2 exeRunDialog state.'
      }
    }
  }
} satisfies Meta<typeof ExeFilePicker>

export default meta

type Story = StoryObj<typeof meta>

function WithDialogOpen({
  games,
  exePath,
  flatpakInaccessible
}: {
  games?: GameInfo[]
  exePath?: string
  flatpakInaccessible?: boolean
}) {
  const appContext = useContext(ContextProvider)

  useEffect(() => {
    useGlobalState.setState({
      exeRunDialog: {
        open: true,
        exePath: exePath ?? '/Games/Heroic/game.exe',
        flatpakInaccessible: flatpakInaccessible ?? false
      }
    })
  }, [exePath, flatpakInaccessible])

  return (
    <ContextProvider.Provider
      value={{
        ...appContext,
        epic: { ...appContext.epic, library: games ?? [] },
        gog: { ...appContext.gog, library: [] },
        amazon: { ...appContext.amazon, library: [] },
        zoom: { ...appContext.zoom, library: [] },
        sideloadedLibrary: []
      }}
    >
      <ExeFilePicker />
    </ContextProvider.Provider>
  )
}

export const Open: Story = {
  render: () => (
    <WithDialogOpen
      games={mockGames}
      exePath="/Games/Heroic/Game One/game.exe"
    />
  )
}

export const WithFlatpakWarning: Story = {
  render: () => (
    <WithDialogOpen
      games={mockGames}
      exePath="/run/user/1000/doc/game.exe"
      flatpakInaccessible
    />
  )
}

export const Empty: Story = {
  render: () => <WithDialogOpen games={[]} exePath="/Games/Heroic/game.exe" />
}

export const Closed: Story = {
  render: () => <ExeFilePicker />,
  play: async () => {
    await expect(screen.queryByRole('dialog')).toBeNull()
  }
}
