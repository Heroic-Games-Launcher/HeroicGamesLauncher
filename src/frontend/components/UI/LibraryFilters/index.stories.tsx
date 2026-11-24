import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import LibraryFilters from '.'

const meta = {
  title: 'Patterns/LibraryFilters',
  component: LibraryFilters,
  parameters: {
    docs: {
      description: {
        component:
          'The library filter dropdown: stores, platforms and the quick toggles for favourites, hidden and installed-only games.'
      }
    }
  }
} satisfies Meta<typeof LibraryFilters>

export default meta

type Story = StoryObj<typeof meta>

export const Collapsed: Story = {}

export const Expanded: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Filters/ }))

    await expect(canvasElement.querySelector('.dropdown')).toHaveClass(
      'expanded'
    )
  }
}
