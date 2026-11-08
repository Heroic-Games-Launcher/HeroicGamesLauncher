import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import InfoIcon from '.'

const meta = {
  title: 'Overlays/InfoIcon',
  component: InfoIcon,
  args: {
    text: 'This game runs natively on Linux.'
  }
} satisfies Meta<typeof InfoIcon>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const ShowsTheTextNextToTheIcon: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvas.getByText('This game runs natively on Linux.')
    ).toBeInTheDocument()
    await expect(canvasElement.querySelector('svg.helpIcon')).not.toBeNull()
  }
}
