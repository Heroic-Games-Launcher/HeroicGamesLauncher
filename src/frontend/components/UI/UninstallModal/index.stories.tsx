import type { GameInfo } from 'common/types'
import { expect, fn, screen } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import UninstallModal from '.'

const gameInfo: GameInfo = {
  runner: 'legendary',
  app_name: 'hollow-knight',
  title: 'Hollow Knight',
  art_cover: '',
  art_square: '',
  is_installed: true,
  canRunOffline: true,
  install: {
    platform: 'windows',
    install_path: '/home/deck/Games/Heroic/Hollow Knight',
    install_size: '9.2 GB'
  }
}

const meta = {
  title: 'Overlays/UninstallModal',
  component: UninstallModal,
  args: {
    appName: gameInfo.app_name,
    runner: 'legendary',
    isDlc: false,
    onClose: fn()
  },
  beforeEach: () => {
    window.api.getGameInfo = () => Promise.resolve(gameInfo)
    return () => {
      delete (window.api as Partial<typeof window.api>).getGameInfo
    }
  },
  parameters: {
    docs: {
      story: { inline: false, height: '560px' },
      description: {
        component:
          'Uninstall confirmation. For Wine games it also offers to delete the prefix and the stored game settings.'
      }
    }
  }
} satisfies Meta<typeof UninstallModal>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const ForADlc: Story = {
  args: { isDlc: true }
}

export const NamesTheGame: Story = {
  play: async () => {
    await expect(await screen.findByRole('dialog')).toHaveTextContent(
      'Hollow Knight'
    )
  }
}
