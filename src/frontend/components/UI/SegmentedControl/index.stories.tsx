import { useState } from 'react'
import { LayoutGrid, List, Rows3 } from 'lucide-react'
import { expect, fn } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import SegmentedControl, { type SegmentedControlItem } from '.'

type StoreValue = 'all' | 'gog' | 'gmg' | 'humble'

const items: SegmentedControlItem<StoreValue>[] = [
  { value: 'all', label: 'All stores' },
  { value: 'gog', label: 'GOG' },
  { value: 'gmg', label: 'GMG' },
  { value: 'humble', label: 'Humble' }
]

const meta = {
  title: 'Navigation/SegmentedControl',
  component: SegmentedControl,
  args: {
    items,
    value: 'all',
    onChange: fn(),
    'aria-label': 'Store'
  },
  parameters: {
    docs: {
      description: {
        component:
          'A rounded segmented control for single-select switches such as the Deals store tabs or a grid/list view toggle. The active segment is filled with the brand colour.'
      }
    }
  }
} satisfies Meta<typeof SegmentedControl<StoreValue>>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithIcons: Story = {
  args: {
    items: [
      { value: 'all', label: 'Grid', glyph: LayoutGrid },
      { value: 'gog', label: 'List', glyph: List },
      { value: 'gmg', label: 'Compact', glyph: Rows3 }
    ],
    value: 'all',
    'aria-label': 'View mode'
  }
}

function Controlled() {
  const [value, setValue] = useState<StoreValue>('all')
  return (
    <>
      <SegmentedControl
        aria-label="Store"
        items={items}
        value={value}
        onChange={setValue}
      />
      <p>Selected: {value}</p>
    </>
  )
}

export const SelectingASegmentUpdatesTheSelection: Story = {
  render: () => <Controlled />,
  play: async ({ canvas, userEvent }) => {
    await expect(
      canvas.getByRole('tab', { name: 'All stores' })
    ).toHaveAttribute('aria-selected', 'true')

    await userEvent.click(canvas.getByRole('tab', { name: 'GOG' }))

    await expect(canvas.getByRole('tab', { name: 'GOG' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    await expect(canvas.getByText('Selected: gog')).toBeInTheDocument()
  }
}
