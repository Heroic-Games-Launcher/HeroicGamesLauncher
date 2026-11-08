import { expect, fn } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import GameActionButton from '.'

const actions = [
  'play',
  'install',
  'update',
  'stop',
  'cancel',
  'queue',
  'unavailable',
  'busy'
] as const

const labels: Record<(typeof actions)[number], string> = {
  play: 'Play',
  install: 'Install',
  update: 'Update',
  stop: 'Stop',
  cancel: 'Cancel',
  queue: 'Remove from queue',
  unavailable: 'Not available',
  busy: 'Working…'
}

const meta = {
  title: 'Atoms/GameActionButton',
  component: GameActionButton,
  args: {
    action: 'play',
    label: 'Play',
    onClick: fn()
  },
  argTypes: {
    action: { control: 'select', options: actions }
  },
  parameters: {
    docs: {
      description: {
        component:
          'The primary action on a game card or game page. Each action maps to a fixed glyph and button variant, so install always looks like install wherever it appears.'
      }
    }
  }
} satisfies Meta<typeof GameActionButton>

export default meta

type Story = StoryObj<typeof meta>

export const Play: Story = {}

export const EveryAction: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
      {actions.map((action) => (
        <GameActionButton
          {...args}
          action={action}
          key={action}
          label={labels[action]}
        />
      ))}
    </div>
  )
}

export const IconOnly: Story = {
  args: { iconOnly: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Play' })
    ).toBeInTheDocument()
  }
}

export const DisabledWithoutHandler: Story = {
  args: { onClick: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button')).toBeDisabled()
  }
}
