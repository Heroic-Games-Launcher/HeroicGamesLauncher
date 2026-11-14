import { Coffee, Heart, Mail, Store } from 'lucide-react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import IconBadge from '.'

const sizes = ['md', 'lg'] as const
const tones = ['surface', 'accent'] as const

const meta = {
  title: 'Atoms/IconBadge',
  component: IconBadge,
  args: {
    glyph: Heart,
    size: 'lg',
    tone: 'surface'
  },
  argTypes: {
    glyph: { table: { disable: true } },
    children: { table: { disable: true } },
    size: { control: 'inline-radio', options: sizes },
    tone: { control: 'inline-radio', options: tones }
  }
} satisfies Meta<typeof IconBadge>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      {sizes.map((size) => (
        <IconBadge {...args} key={size} size={size} />
      ))}
    </div>
  )
}

export const Tones: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      {tones.map((tone) => (
        <IconBadge {...args} key={tone} tone={tone} />
      ))}
    </div>
  )
}

export const Glyphs: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <IconBadge {...args} glyph={Heart} />
      <IconBadge {...args} glyph={Coffee} />
      <IconBadge {...args} glyph={Store} />
      <IconBadge {...args} glyph={Mail} />
    </div>
  )
}

export const CustomContent: Story = {
  args: {
    glyph: undefined,
    children: <strong>GOG</strong>
  }
}
