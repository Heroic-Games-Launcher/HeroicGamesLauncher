import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import WindowControls from '.'

const meta = {
  title: 'Navigation/WindowControls',
  component: WindowControls,
  parameters: {
    docs: {
      description: {
        component:
          'Minimise, maximise and close buttons drawn by Heroic when the platform does not provide a native overlay.'
      }
    }
  }
} satisfies Meta<typeof WindowControls>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Maximized: Story = {
  beforeEach: () => {
    window.api.isMaximized = () => Promise.resolve(true as const)
    return () => {
      delete (window.api as Partial<typeof window.api>).isMaximized
    }
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByTitle('Restore window')).toBeInTheDocument()
  }
}

export const HasAllThreeControls: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByTitle('Minimize window')).toBeInTheDocument()
    await expect(canvas.getByTitle('Maximize window')).toBeInTheDocument()
    await expect(canvas.getByTitle('Close')).toBeInTheDocument()
  }
}
