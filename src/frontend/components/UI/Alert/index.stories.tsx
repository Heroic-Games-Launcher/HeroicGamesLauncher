import { Gamepad2 } from 'lucide-react'
import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import Alert from '.'
import Button from '../Button'

const variants = ['neutral', 'info', 'success', 'warning', 'error'] as const

const meta = {
  title: 'Feedback/Alert',
  component: Alert,
  args: {
    children: 'This game needs a Wine prefix before it can be launched.',
    variant: 'neutral'
  },
  argTypes: {
    variant: { control: 'select', options: variants },
    glyph: { table: { disable: true } }
  },
  parameters: {
    docs: {
      description: {
        component:
          'Inline message block. The error variant announces itself through role="alert", the rest use role="status".'
      }
    }
  }
} satisfies Meta<typeof Alert>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {variants.map((variant) => (
        <Alert {...args} key={variant} variant={variant}>
          {variant}
        </Alert>
      ))}
    </div>
  )
}

export const WithTitle: Story = {
  args: {
    title: 'Anticheat not supported',
    variant: 'warning',
    children:
      'Multiplayer features may not work due to denied or broken anticheat support.'
  }
}

export const WithActions: Story = {
  args: {
    variant: 'info',
    title: 'An update is available',
    children: 'Heroic 2.23.0 is ready to install.',
    actions: (
      <>
        <Button size="sm" variant="ghost">
          Later
        </Button>
        <Button size="sm">Install</Button>
      </>
    )
  }
}

export const WithCustomGlyph: Story = {
  args: { glyph: Gamepad2, children: 'Controller detected.' }
}

export const ErrorIsAnnounced: Story = {
  args: { variant: 'error' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alert')).toBeInTheDocument()
  }
}

export const NonErrorIsAStatus: Story = {
  args: { variant: 'info' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toBeInTheDocument()
  }
}
