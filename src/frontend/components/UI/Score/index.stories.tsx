import { expect, fn } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import Score from '.'

const meta = {
  title: 'Atoms/Score',
  component: Score,
  args: {
    label: 'Metacritic',
    value: '87'
  },
  parameters: {
    docs: {
      description: {
        component:
          'Review score pill. The colour is derived from the value: above 66 reads as high, below 33 as low, anything unparseable falls back to a neutral question mark.'
      }
    }
  }
} satisfies Meta<typeof Score>

export default meta

type Story = StoryObj<typeof meta>

export const High: Story = {}

export const Mid: Story = {
  args: { value: '54' }
}

export const Low: Story = {
  args: { value: '22' }
}

export const Unknown: Story = {
  args: { value: null },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('?')).toBeInTheDocument()
  }
}

export const Row: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.75rem' }}>
      <Score {...args} label="Metacritic" value="91" />
      <Score {...args} label="OpenCritic" value="48" />
      <Score {...args} label="User score" value="18" />
      <Score {...args} label="ProtonDB" value={null} />
    </div>
  )
}

export const Clickable: Story = {
  args: { onClick: fn(), title: 'Open the review page' },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button'))
    await expect(args.onClick).toHaveBeenCalledTimes(1)
  }
}
