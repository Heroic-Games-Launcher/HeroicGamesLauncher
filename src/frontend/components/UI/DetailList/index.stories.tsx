import { Calendar, HardDrive, Languages, Tag } from 'lucide-react'
import { expect, fn } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import DetailList, { type DetailItem } from '.'

const items: DetailItem[] = [
  { label: 'Developer', value: 'Team Cherry' },
  { label: 'Release date', value: '24 February 2017', glyph: Calendar },
  { label: 'Install size', value: '9.2 GB', glyph: HardDrive },
  { label: 'Languages', value: 'English, Português, 日本語', glyph: Languages },
  { label: 'Version', value: '1.5.78.11833', glyph: Tag }
]

const meta = {
  title: 'Data Display/DetailList',
  component: DetailList,
  args: { items },
  argTypes: {
    columns: { control: 'inline-radio', options: [1, 2] }
  },
  parameters: {
    docs: {
      description: {
        component:
          'Definition list used for game metadata. Icons are optional, but once one item has a glyph every row reserves the icon column so the labels stay aligned.'
      }
    }
  }
} satisfies Meta<typeof DetailList>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const TwoColumns: Story = {
  args: { columns: 2 }
}

export const WithoutIcons: Story = {
  args: {
    items: items.map(({ label, value }) => ({ label, value }))
  }
}

export const ClickableRow: Story = {
  args: {
    items: [
      ...items,
      {
        label: 'Store page',
        value: 'Open on GOG',
        onClick: fn(),
        title: 'Opens in your browser'
      }
    ]
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByText('Open on GOG'))
    await expect(canvas.getByTitle('Opens in your browser')).toBeInTheDocument()
  }
}

export const NothingWhenEmpty: Story = {
  args: { items: [] },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.DetailList')).toBeNull()
  }
}
