import { useState } from 'react'
import { Gamepad2 } from 'lucide-react'
import { expect, fn } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import Chip from '.'
import Icon from '../Icon'

const meta = {
  title: 'Atoms/Chip',
  component: Chip,
  args: {
    children: 'Epic Games',
    onClick: fn()
  },
  parameters: {
    docs: {
      description: {
        component:
          'A toggleable filter pill. The pressed state is exposed through aria-pressed, which is what the library filters rely on.'
      }
    }
  }
} satisfies Meta<typeof Chip>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Active: Story = {
  args: { active: true }
}

export const WithIcon: Story = {
  args: {
    icon: <Icon glyph={Gamepad2} size="xs" />,
    children: 'Controller ready'
  }
}

export const Group: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      {['All', 'Epic Games', 'GOG', 'Amazon', 'itch.io', 'Sideloaded'].map(
        (label, index) => (
          <Chip {...args} active={index === 1} key={label}>
            {label}
          </Chip>
        )
      )}
    </div>
  )
}

function ToggleableChip() {
  const [active, setActive] = useState(false)

  return (
    <Chip active={active} onClick={() => setActive(!active)}>
      Installed only
    </Chip>
  )
}

export const TogglesPressedState: Story = {
  render: () => <ToggleableChip />,
  play: async ({ canvas, userEvent }) => {
    const chip = canvas.getByRole('button', { name: 'Installed only' })

    await expect(chip).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(chip)
    await expect(chip).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(chip)
    await expect(chip).toHaveAttribute('aria-pressed', 'false')
  }
}
