import { expect, fn } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import TextWithProgress from '.'

const meta = {
  title: 'Feedback/TextWithProgress',
  component: TextWithProgress,
  args: {
    text: 'Checking disk space'
  }
} satisfies Meta<typeof TextWithProgress>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Clickable: Story = {
  args: { text: 'Downloading, click to cancel', onClick: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button'))
    await expect(args.onClick).toHaveBeenCalledTimes(1)
  }
}
