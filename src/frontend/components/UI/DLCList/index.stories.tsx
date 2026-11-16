import type { GameInfo } from 'common/types'
import type { DLCInfo } from 'common/types/legendary'
import { expect, fn } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import DLCList from '.'

const mainAppInfo: GameInfo = {
  runner: 'legendary',
  app_name: 'cyberpunk-2077',
  title: 'Cyberpunk 2077',
  art_cover: '',
  art_square: '',
  is_installed: true,
  canRunOffline: true,
  install: {
    platform: 'windows',
    install_path: '/home/deck/Games/Heroic/Cyberpunk 2077'
  }
}

const dlcs: DLCInfo[] = [
  { app_name: 'phantom-liberty', title: 'Phantom Liberty' },
  { app_name: 'rt-overdrive', title: 'Ray Tracing Overdrive pack' }
]

const meta = {
  title: 'Data Display/DLCList',
  component: DLCList,
  args: {
    dlcs,
    runner: 'legendary',
    mainAppInfo,
    onClose: fn()
  },
  parameters: {
    docs: {
      description: {
        component:
          'The DLC table on the game page. Each row resolves its own install state and download size, so rows show a spinner until that lookup finishes.'
      }
    }
  }
} satisfies Meta<typeof DLCList>

export default meta

type Story = StoryObj<typeof meta>

export const WithDlcs: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Phantom Liberty')).toBeInTheDocument()
    await expect(
      canvas.getByText('Ray Tracing Overdrive pack')
    ).toBeInTheDocument()
  }
}

export const Empty: Story = {
  args: { dlcs: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('No DLCs found')).toBeInTheDocument()
  }
}
