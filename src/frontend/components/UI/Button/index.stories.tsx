import { Download, Play, Trash2 } from 'lucide-react'
import { expect, fn } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import Button from '.'
import Icon from '../Icon'

const variants = [
  'primary',
  'secondary',
  'ghost',
  'danger',
  'dangerSubtle',
  'warning'
] as const

const meta = {
  title: 'Atoms/Button',
  component: Button,
  args: {
    children: 'Play',
    onClick: fn()
  },
  argTypes: {
    variant: { control: 'select', options: variants },
    size: { control: 'inline-radio', options: ['sm', 'md'] }
  },
  parameters: {
    docs: {
      description: {
        component:
          'danger is the quiet destructive button: the surface and label stay neutral and the red lives in the icon, so give it one. Reach for dangerSubtle when there is no icon to carry the signal, or when the whole control should read as destructive.'
      }
    }
  }
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

export const Primary: Story = {}

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
      {variants.map((variant) => (
        <Button
          {...args}
          icon={<Icon glyph={Trash2} size="sm" />}
          key={variant}
          variant={variant}
        >
          {variant}
        </Button>
      ))}
    </div>
  )
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="md">
        Medium
      </Button>
    </div>
  )
}

export const WithIcon: Story = {
  args: {
    icon: <Icon glyph={Play} size="sm" />,
    children: 'Play now'
  }
}

export const IconOnly: Story = {
  args: {
    children: undefined,
    icon: <Icon glyph={Trash2} size="sm" />,
    'aria-label': 'Uninstall'
  }
}

export const FullWidth: Story = {
  args: {
    fullWidth: true,
    icon: <Icon glyph={Download} size="sm" />,
    children: 'Install'
  }
}

export const Disabled: Story = {
  args: { disabled: true }
}

export const Destructive: Story = {
  args: {
    variant: 'danger',
    icon: <Icon glyph={Trash2} size="sm" />,
    children: 'Reset Heroic'
  },
  parameters: {
    docs: {
      description: {
        story:
          'The destructive action stays quiet: a recessed surface and a neutral label, with the red carried by the icon alone. Use dangerSubtle when the whole control has to read as destructive.'
      }
    }
  }
}

export const CallsOnClick: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Play' }))
    await expect(args.onClick).toHaveBeenCalledTimes(1)
  }
}

export const DisabledDoesNotCallOnClick: Story = {
  args: { disabled: true },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'Play' })
    await expect(button).toBeDisabled()
    await expect(args.onClick).not.toHaveBeenCalled()
  }
}
