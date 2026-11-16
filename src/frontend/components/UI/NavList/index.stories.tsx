import { Download, Gamepad2, Settings, Wine } from 'lucide-react'
import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import NavList, { type NavListItem } from '.'

const items: NavListItem[] = [
  { to: '/settings/general', label: 'General', glyph: Settings },
  { to: '/wine-manager', label: 'Wine manager', glyph: Wine },
  { to: '/download-manager', label: 'Downloads', glyph: Download },
  { to: '/accessibility', label: 'Accessibility', glyph: Gamepad2 }
]

const meta = {
  title: 'Navigation/NavList',
  component: NavList,
  args: {
    items,
    'aria-label': 'Settings sections'
  }
} satisfies Meta<typeof NavList>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <div style={{ maxWidth: '22rem' }}>
      <NavList {...args} />
    </div>
  )
}

export const WithoutGlyphs: Story = {
  args: {
    items: items.map(({ to, label }) => ({ to, label }))
  }
}

export const RendersOneLinkPerItem: Story = {
  play: async ({ canvas }) => {
    const links = canvas.getAllByRole('link')

    await expect(links).toHaveLength(items.length)
    await expect(links[0]).toHaveAttribute('href', '/settings/general')
  }
}
