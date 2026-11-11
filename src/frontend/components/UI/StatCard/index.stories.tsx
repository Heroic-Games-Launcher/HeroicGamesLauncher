import { Clock, Gamepad2, HardDrive, TrendingUp } from 'lucide-react'
import { expect, fn } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import StatCard from '.'

const meta = {
  title: 'Data Display/StatCard',
  component: StatCard,
  args: {
    label: 'Play time',
    value: '42 h 18 min',
    glyph: Clock
  },
  argTypes: {
    glyph: { table: { disable: true } }
  }
} satisfies Meta<typeof StatCard>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithoutGlyph: Story = {
  args: { glyph: undefined }
}

export const Grid: Story = {
  render: (args) => (
    <div
      style={{
        display: 'grid',
        gap: '0.75rem',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))'
      }}
    >
      <StatCard {...args} />
      <StatCard
        {...args}
        glyph={HardDrive}
        label="Install size"
        value="9.2 GB"
      />
      <StatCard {...args} glyph={Gamepad2} label="Games" value="128" />
      <StatCard {...args} glyph={TrendingUp} label="Metacritic" value="90" />
    </div>
  )
}

export const Clickable: Story = {
  args: { onClick: fn(), title: 'Open the play time breakdown' },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByTitle('Open the play time breakdown'))
    await expect(args.onClick).toHaveBeenCalledTimes(1)
  }
}
