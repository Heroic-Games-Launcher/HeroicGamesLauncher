import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import WebviewControls from '.'

const meta = {
  title: 'Navigation/WebviewControls',
  component: WebviewControls,
  args: {
    webview: null,
    initURL: 'https://www.gog.com/games',
    openInBrowser: true
  },
  parameters: {
    docs: {
      description: {
        component:
          'Address bar and navigation buttons for the embedded store browser. The webview prop is the Electron tag it drives, left null here.'
      }
    }
  }
} satisfies Meta<typeof WebviewControls>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithoutOpenInBrowser: Story = {
  args: { openInBrowser: false }
}

export const WithInputToggle: Story = {
  args: { showInputToggle: true }
}

export const InGameInputMode: Story = {
  args: { showInputToggle: true, gameInputMode: true }
}

export const ShowsTheCurrentUrl: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByDisplayValue('https://www.gog.com/games')
    ).toBeInTheDocument()
  }
}
