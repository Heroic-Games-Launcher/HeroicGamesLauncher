import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import PlatformIcon from '.'

const platforms = ['Windows', 'osx', 'linux', 'Browser']

const meta = {
  title: 'Atoms/PlatformIcon',
  component: PlatformIcon,
  args: { platform: 'Windows' },
  argTypes: {
    platform: { control: 'select', options: platforms }
  }
} satisfies Meta<typeof PlatformIcon>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: 'Windows' })).toBeVisible()
  }
}

export const EveryPlatform: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.75rem' }}>
      {platforms.map((platform) => (
        <PlatformIcon key={platform} platform={platform} />
      ))}
    </div>
  )
}
