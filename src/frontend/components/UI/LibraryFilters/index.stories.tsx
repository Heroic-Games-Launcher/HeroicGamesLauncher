import { ReactNode, useContext } from 'react'
import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import LibraryContext from 'frontend/screens/Library/LibraryContext'
import type { LibraryContextType } from 'frontend/types'

import LibraryFilters from '.'

function WithFilters({
  filters,
  children
}: {
  filters: Partial<LibraryContextType>
  children: ReactNode
}) {
  const libraryContext = useContext(LibraryContext)

  return (
    <LibraryContext.Provider value={{ ...libraryContext, ...filters }}>
      {children}
    </LibraryContext.Provider>
  )
}

const meta = {
  title: 'Patterns/LibraryFilters',
  component: LibraryFilters,
  parameters: {
    docs: {
      description: {
        component:
          'The library filter dropdown: stores, platforms and the quick toggles for favourites, hidden and installed-only games. The pill shows how many filters are active.'
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

export const ShowsActiveFilterCount: Story = {
  render: () => (
    <WithFilters
      filters={{
        storesFilters: {
          legendary: true,
          gog: true,
          nile: true,
          sideload: false,
          zoom: true,
          itchio: true,
          itchioBundles: false,
          steam: true
        },
        platformsFilters: {
          win: true,
          linux: true,
          mac: true,
          browser: false
        },
        showFavourites: true,
        showInstalledOnly: true
      }}
    >
      <LibraryFilters />
    </WithFilters>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('4 filters applied')).toHaveTextContent(
      '4'
    )
  }
}

export const HidesBadgeWithoutFilters: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByLabelText(/filters applied/)
    ).not.toBeInTheDocument()
  }
}
