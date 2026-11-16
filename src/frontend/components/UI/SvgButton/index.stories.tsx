import { Settings } from 'lucide-react'
import { expect, fn } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import SvgButton from '.'
import Icon from '../Icon'

const meta = {
  title: 'Atoms/SvgButton',
  component: SvgButton,
  args: {
    onClick: fn(),
    title: 'Game settings',
    children: <Icon glyph={Settings} size="lg" />
  },
  parameters: {
    docs: {
      description: {
        component:
          'A bare button that only wraps an icon. New code should prefer Button with an icon and no label, SvgButton is kept for the icon affordances inside inputs and cards.'
      }
    }
  }
} satisfies Meta<typeof SvgButton>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Disabled: Story = {
  args: { disabled: true }
}

export const CallsOnClick: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Game settings' }))
    await expect(args.onClick).toHaveBeenCalledTimes(1)
  }
}
