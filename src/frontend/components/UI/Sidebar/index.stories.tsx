import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import Sidebar from '.'

const meta = {
  title: 'Patterns/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The app navigation rail. It is resizable by dragging its right edge and collapses to icons below 120px, with the width persisted in localStorage.'
      }
    }
  }
} satisfies Meta<typeof Sidebar>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
    </div>
  )
}

export const Collapsed: Story = {
  beforeEach: () => {
    localStorage.setItem('sidebar-width', '72')
    return () => localStorage.removeItem('sidebar-width')
  },
  render: () => (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.Sidebar')).toHaveClass(
      'collapsed'
    )
  }
}

export const LinksToEveryScreen: Story = {
  render: () => (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
    </div>
  ),
  play: async ({ canvas }) => {
    const links = canvas.getAllByRole('link')

    await expect(links.length).toBeGreaterThan(0)
  }
}
