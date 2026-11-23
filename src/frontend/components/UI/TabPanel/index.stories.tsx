import { useState } from 'react'
import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import TabPanel from '.'
import Tabs, { type TabItem } from '../Tabs'

const meta = {
  title: 'Navigation/TabPanel',
  component: TabPanel,
  args: {
    index: 'info',
    value: 'info',
    children: 'Information panel content'
  },
  parameters: {
    docs: {
      description: {
        component:
          'The panel half of the tab pattern. It wires itself to the matching Tabs button through the tab-/tabpanel- id convention and only renders its children while selected.'
      }
    }
  }
} satisfies Meta<typeof TabPanel>

export default meta

type Story = StoryObj<typeof meta>

export const Selected: Story = {}

export const NotSelected: Story = {
  args: { value: 'wine' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('tabpanel')).toBeEmptyDOMElement()
  }
}

type TabValue = 'info' | 'wine'

const items: TabItem<TabValue>[] = [
  { value: 'info', label: 'Information' },
  { value: 'wine', label: 'Wine' }
]

function TabsWithPanels() {
  const [value, setValue] = useState<TabValue>('info')

  return (
    <>
      <Tabs
        aria-label="Sections"
        items={items}
        onChange={setValue}
        value={value}
      />
      <TabPanel index="info" value={value}>
        Release date, developer and store links live here.
      </TabPanel>
      <TabPanel index="wine" value={value}>
        Wine version, prefix and DXVK settings live here.
      </TabPanel>
    </>
  )
}

export const WiredToTabs: Story = {
  render: () => <TabsWithPanels />,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText(/Release date/)).toBeInTheDocument()

    await userEvent.click(canvas.getByRole('tab', { name: 'Wine' }))

    await expect(canvas.getByText(/Wine version/)).toBeInTheDocument()
  }
}
