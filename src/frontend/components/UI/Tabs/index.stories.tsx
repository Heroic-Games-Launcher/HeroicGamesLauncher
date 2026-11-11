import { useState } from 'react'
import { Gamepad2, Info, Save, Wine } from 'lucide-react'
import { expect, fn } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import Tabs, { type TabItem } from '.'

type TabValue = 'info' | 'wine' | 'saves' | 'controller'

const items: TabItem<TabValue>[] = [
  { value: 'info', label: 'Information', glyph: Info },
  { value: 'wine', label: 'Wine', glyph: Wine },
  { value: 'saves', label: 'Cloud saves', glyph: Save },
  { value: 'controller', label: 'Controller', glyph: Gamepad2 }
]

const meta = {
  title: 'Navigation/Tabs',
  component: Tabs,
  args: {
    items,
    value: 'info',
    onChange: fn(),
    'aria-label': 'Game settings sections'
  }
} satisfies Meta<typeof Tabs<TabValue>>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithoutGlyphs: Story = {
  args: {
    items: items.map(({ value, label }) => ({ value, label }))
  }
}

export const Scrollable: Story = {
  args: {
    items: [
      ...items,
      { value: 'info', label: 'Advanced' },
      { value: 'wine', label: 'Logs' },
      { value: 'saves', label: 'Shortcuts' },
      { value: 'controller', label: 'Experimental' }
    ] as TabItem<TabValue>[]
  },
  render: (args) => (
    <div style={{ maxWidth: '24rem' }}>
      <Tabs {...args} />
    </div>
  )
}

function ControlledTabs() {
  const [value, setValue] = useState<TabValue>('info')

  return (
    <>
      <Tabs
        aria-label="Game settings sections"
        items={items}
        onChange={setValue}
        value={value}
      />
      <p>Selected: {value}</p>
    </>
  )
}

export const SelectingATabUpdatesTheSelection: Story = {
  render: () => <ControlledTabs />,
  play: async ({ canvas, userEvent }) => {
    await expect(
      canvas.getByRole('tab', { name: 'Information' })
    ).toHaveAttribute('aria-selected', 'true')

    await userEvent.click(canvas.getByRole('tab', { name: 'Wine' }))

    await expect(canvas.getByRole('tab', { name: 'Wine' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    await expect(canvas.getByText('Selected: wine')).toBeInTheDocument()
  }
}
