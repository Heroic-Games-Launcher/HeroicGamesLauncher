import { FolderOpen, Pencil, Play, Trash2 } from 'lucide-react'
import { expect, fn } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import MenuItem from '.'

const meta = {
  title: 'Atoms/MenuItem',
  component: MenuItem,
  args: {
    children: 'Play',
    glyph: Play,
    onClick: fn()
  },
  argTypes: {
    tone: { control: 'inline-radio', options: ['default', 'danger'] },
    glyph: { table: { disable: true } }
  }
} satisfies Meta<typeof MenuItem>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Danger: Story = {
  args: { children: 'Uninstall', glyph: Trash2, tone: 'danger' }
}

export const Disabled: Story = {
  args: { disabled: true }
}

export const Menu: Story = {
  render: (args) => (
    <div
      role="menu"
      style={{
        background: 'var(--panel-surface)',
        border: '1px solid var(--panel-border)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        flexDirection: 'column',
        padding: '0.25rem',
        width: '16rem'
      }}
    >
      <MenuItem {...args} glyph={Play}>
        Play
      </MenuItem>
      <MenuItem {...args} glyph={Pencil}>
        Edit game
      </MenuItem>
      <MenuItem {...args} glyph={FolderOpen}>
        Open install folder
      </MenuItem>
      <MenuItem {...args} glyph={Trash2} tone="danger">
        Uninstall
      </MenuItem>
    </div>
  )
}

export const HasMenuItemRole: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const item = canvas.getByRole('menuitem', { name: 'Play' })

    await userEvent.click(item)
    await expect(args.onClick).toHaveBeenCalledTimes(1)
  }
}
