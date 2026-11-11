import { HardDrive } from 'lucide-react'
import { expect, screen } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import Tooltip from '.'
import Button from '../Button'
import Icon from '../Icon'

const meta = {
  title: 'Overlays/Tooltip',
  component: Tooltip,
  args: {
    content: 'Sort by installed games first',
    children: <Button variant="ghost">Hover me</Button>
  },
  argTypes: {
    placement: {
      control: 'inline-radio',
      options: ['top', 'bottom', 'left', 'right']
    }
  },
  parameters: {
    docs: {
      description: {
        component:
          'Hover and focus tooltip. Pass asChild when the child already accepts a ref, otherwise it is wrapped in an anchor span.'
      }
    }
  }
} satisfies Meta<typeof Tooltip>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Placements: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '2rem', padding: '3rem' }}>
      {(['top', 'bottom', 'left', 'right'] as const).map((placement) => (
        <Tooltip {...args} key={placement} placement={placement}>
          <Button variant="ghost">{placement}</Button>
        </Tooltip>
      ))}
    </div>
  )
}

export const AsChild: Story = {
  args: {
    asChild: true,
    children: (
      <button aria-label="Install size">
        <Icon glyph={HardDrive} size="md" />
      </button>
    )
  }
}

export const AppearsOnHover: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.hover(canvas.getByRole('button', { name: 'Hover me' }))

    await expect(
      await screen.findByText('Sort by installed games first')
    ).toBeInTheDocument()
  }
}
