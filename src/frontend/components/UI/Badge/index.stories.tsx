import { CircleCheck, HardDrive, TriangleAlert } from 'lucide-react'
import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import Badge from '.'

const variants = [
  'neutral',
  'accent',
  'info',
  'success',
  'warning',
  'error',
  'gradient'
] as const

const meta = {
  title: 'Atoms/Badge',
  component: Badge,
  args: {
    children: 'Installed',
    variant: 'neutral'
  },
  argTypes: {
    variant: { control: 'select', options: variants },
    glyph: { table: { disable: true } }
  }
} satisfies Meta<typeof Badge>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      {variants.map((variant) => (
        <Badge {...args} key={variant} variant={variant}>
          {variant}
        </Badge>
      ))}
    </div>
  )
}

export const WithGlyph: Story = {
  args: {
    glyph: CircleCheck,
    variant: 'success',
    children: 'Up to date'
  }
}

export const OnOverlay: Story = {
  args: {
    onOverlay: true,
    glyph: HardDrive,
    children: '42 GB'
  },
  render: (args) => (
    <div
      style={{
        background: 'linear-gradient(135deg, #1b2735 0%, #090a0f 100%)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        gap: '0.5rem',
        padding: '2rem'
      }}
    >
      <Badge {...args} />
      <Badge {...args} glyph={TriangleAlert} variant="warning">
        Anticheat
      </Badge>
    </div>
  )
}

export const ExposesTitleAsTooltip: Story = {
  args: { title: 'Installed on this device' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByTitle('Installed on this device')
    ).toHaveTextContent('Installed')
  }
}
