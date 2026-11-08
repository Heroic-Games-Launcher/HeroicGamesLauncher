import type { GameInfo } from 'common/types'
import { expect, fn } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import EditGameDialog from '.'

const gameInfo: GameInfo = {
  runner: 'sideload',
  app_name: 'my-sideloaded-game',
  title: 'My sideloaded game',
  art_cover: 'https://example.com/cover.jpg',
  art_square: 'https://example.com/square.jpg',
  is_installed: true,
  canRunOffline: true,
  install: {
    platform: 'windows',
    executable: '/home/deck/Games/game/game.exe'
  }
}

const meta = {
  title: 'Overlays/EditGameDialog',
  component: EditGameDialog,
  args: {
    gameInfo,
    backdropClick: fn()
  },
  parameters: {
    docs: {
      description: {
        component:
          'Lets the user override a game’s title and artwork. The magnifier next to each art field opens the SteamGridDB picker.'
      }
    }
  }
} satisfies Meta<typeof EditGameDialog>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithOverrides: Story = {
  args: {
    gameInfo: {
      ...gameInfo,
      overrides: {
        title: 'My game (modded)',
        art_cover: 'https://example.com/custom-cover.jpg'
      }
    }
  }
}

export const PrefillsTheCurrentTitle: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByDisplayValue('My sideloaded game')
    ).toBeInTheDocument()
  }
}
