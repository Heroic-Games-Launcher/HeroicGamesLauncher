import {
  Download,
  Gamepad2,
  Play,
  Settings,
  Trash2,
  type LucideIcon
} from 'lucide-react'
import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import Icon from '.'

const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const

const glyphs: Record<string, LucideIcon> = {
  Play,
  Download,
  Settings,
  Trash2,
  Gamepad2
}

const meta = {
  title: 'Atoms/Icon',
  component: Icon,
  args: {
    glyph: Play,
    size: 'lg'
  },
  argTypes: {
    glyph: {
      control: 'select',
      options: Object.keys(glyphs),
      mapping: glyphs
    },
    size: { control: 'inline-radio', options: sizes }
  },
  parameters: {
    docs: {
      description: {
        component:
          'The single entry point for iconography. Every icon in the app is a lucide-react glyph rendered through this component so sizes and stroke widths stay consistent.'
      }
    }
  }
} satisfies Meta<typeof Icon>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ alignItems: 'center', display: 'flex', gap: '1rem' }}>
      {sizes.map((size) => (
        <span
          key={size}
          style={{
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
        >
          <Icon {...args} size={size} />
          <small>{size}</small>
        </span>
      ))}
    </div>
  )
}

export const StrokeWidths: Story = {
  render: (args) => (
    <div style={{ alignItems: 'center', display: 'flex', gap: '1rem' }}>
      {[1, 1.75, 2.25, 3].map((strokeWidth) => (
        <Icon {...args} key={strokeWidth} strokeWidth={strokeWidth} />
      ))}
    </div>
  )
}

export const Filled: Story = {
  args: {
    glyph: Gamepad2,
    fill: 'currentColor',
    fillOpacity: 0.2,
    size: 'xl'
  }
}

export const Labelled: Story = {
  args: { label: 'Play game' },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Play game')).toBeInTheDocument()
  }
}

export const HiddenFromScreenReaders: Story = {
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector('svg')

    await expect(svg).toHaveAttribute('aria-hidden', 'true')
  }
}
