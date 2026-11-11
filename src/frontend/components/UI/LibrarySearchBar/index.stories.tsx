import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import LibrarySearchBar from '.'

const meta = {
  title: 'Patterns/LibrarySearchBar',
  component: LibrarySearchBar,
  parameters: {
    docs: {
      description: {
        component:
          'Not a second search bar: it is the container that wires the shared SearchBar atom to the library. It owns the query, builds the suggestion list from every logged-in store and navigates to the picked game. WinetricksSearch is the same pattern for Winetricks components.'
      }
    }
  }
} satisfies Meta<typeof LibrarySearchBar>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('searchBar')).toBeInTheDocument()
  }
}
