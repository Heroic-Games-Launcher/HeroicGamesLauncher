import { expect, fn, screen } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import Winetricks from '.'

const installed = ['corefonts', 'vcrun2022']
const available = [
  'corefonts',
  'vcrun2022',
  'dotnet48',
  'd3dx9',
  'physx',
  'xact'
]

const meta = {
  title: 'Overlays/Winetricks',
  component: Winetricks,
  args: {
    runner: 'legendary',
    onClose: fn()
  },
  beforeEach: () => {
    window.api.winetricksListInstalled = () => Promise.resolve(installed)
    window.api.winetricksListAvailable = () => Promise.resolve(available)
    return () => {
      delete (window.api as Partial<typeof window.api>).winetricksListInstalled
      delete (window.api as Partial<typeof window.api>).winetricksListAvailable
    }
  },
  parameters: {
    docs: {
      description: {
        component:
          'Winetricks component browser. It lists what is already installed in the prefix and lets the user queue new components, streaming the output into a ProgressDialog.'
      }
    }
  }
} satisfies Meta<typeof Winetricks>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const ListsInstalledComponents: Story = {
  play: async () => {
    const dialog = await screen.findByRole('dialog')

    await expect(dialog).toHaveTextContent('corefonts')
  }
}
