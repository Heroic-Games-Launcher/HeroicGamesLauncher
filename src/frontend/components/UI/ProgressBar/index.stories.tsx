import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import ProgressBar from '.'

const meta = {
  title: 'Atoms/ProgressBar',
  component: ProgressBar,
  args: {
    value: 42,
    label: 'Download progress'
  },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    tone: {
      control: 'inline-radio',
      options: ['accent', 'success', 'warning']
    },
    size: { control: 'inline-radio', options: ['sm', 'md'] }
  }
} satisfies Meta<typeof ProgressBar>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Tones: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {(['accent', 'success', 'warning'] as const).map((tone) => (
        <ProgressBar {...args} key={tone} showValue tone={tone} />
      ))}
    </div>
  )
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <ProgressBar {...args} size="sm" />
      <ProgressBar {...args} size="md" />
    </div>
  )
}

export const WithValue: Story = {
  args: { showValue: true, value: 87 }
}

export const Indeterminate: Story = {
  args: { value: undefined },
  play: async ({ canvas }) => {
    const bar = canvas.getByRole('progressbar')

    await expect(bar).not.toHaveAttribute('aria-valuenow')
  }
}

export const ClampsOutOfRangeValues: Story = {
  args: { value: 140 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100'
    )
  }
}
