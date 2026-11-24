import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import CountBadge from '.'

const meta = {
  title: 'Atoms/CountBadge',
  component: CountBadge,
  args: {
    count: 3,
    label: '3 filters applied'
  },
  parameters: {
    docs: {
      description: {
        component:
          'Compact numeric badge for filter and category pills. It renders nothing when the count is zero.'
      }
    }
  }
} satisfies Meta<typeof CountBadge>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Counts: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {[1, 2, 9, 24].map((count) => (
        <CountBadge
          {...args}
          key={count}
          count={count}
          label={`${count} filters applied`}
        />
      ))}
    </div>
  )
}

export const ZeroRendersNothing: Story = {
  args: { count: 0 },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.CountBadge')).toBeNull()
  }
}

export const ExposesLabel: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('3 filters applied')).toHaveTextContent(
      '3'
    )
  }
}
