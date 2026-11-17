import { Download, LibraryBig, SearchX } from 'lucide-react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import EmptyState from '.'
import Button from '../Button'
import Icon from '../Icon'

const meta = {
  title: 'Feedback/EmptyState',
  component: EmptyState,
  args: {
    title: 'No games found',
    glyph: SearchX
  },
  argTypes: {
    glyph: { table: { disable: true } }
  }
} satisfies Meta<typeof EmptyState>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithDescription: Story = {
  args: {
    description: 'Try a different search term or clear the active filters.'
  }
}

export const WithAction: Story = {
  args: {
    glyph: LibraryBig,
    title: 'Your library is empty',
    description: 'Log in to a store to pull your games into Heroic.',
    action: (
      <Button icon={<Icon glyph={Download} size="sm" />}>Add a store</Button>
    )
  }
}

export const WithoutGlyph: Story = {
  args: { glyph: undefined, description: 'Nothing to show here yet.' }
}
