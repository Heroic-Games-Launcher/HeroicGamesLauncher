import { expect, fn, screen } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { ProgressDialog } from '.'

const progress = [
  'Executing w_do_call corefonts',
  'Downloading https://downloads.sourceforge.net/corefonts/andale32.exe',
  'wine: warn: cabextract not found, falling back',
  'Executing wine regedit',
  'wine: err: failed to register the font, retrying',
  'Executing w_do_call vcrun2022'
]

const meta = {
  title: 'Overlays/ProgressDialog',
  component: ProgressDialog,
  args: {
    title: 'Installing Winetricks components',
    progress,
    showCloseButton: true,
    onClose: fn()
  },
  parameters: {
    docs: {
      description: {
        component:
          'Streaming log dialog used by Winetricks and the Wine manager. Lines containing err or warn are coloured, and the log auto-scrolls until the user scrolls away from the bottom.'
      }
    }
  }
} satisfies Meta<typeof ProgressDialog>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  args: { progress: [] }
}

export const WithoutProgressBar: Story = {
  args: { hideProgress: true }
}

export const HighlightsErrorsAndWarnings: Story = {
  play: async () => {
    const dialog = await screen.findByRole('dialog')

    await expect(dialog.querySelectorAll('.log-error')).toHaveLength(1)
    await expect(dialog.querySelectorAll('.log-warning')).toHaveLength(1)
    await expect(dialog.querySelectorAll('.log-info')).toHaveLength(4)
  }
}
