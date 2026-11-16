import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import BackButton from '.'

const meta = {
  title: 'Navigation/BackButton',
  component: BackButton,
  args: {
    to: '/',
    label: 'Back to library'
  }
} satisfies Meta<typeof BackButton>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const LinksToTheTarget: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: 'Back to library' })
    ).toHaveAttribute('href', '/')
  }
}
