import { ReactNode, useContext } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'
import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import CategoryFilter from '.'

function WithCategories({
  categories,
  children,
  selected = []
}: {
  categories: string[]
  children: ReactNode
  selected?: string[]
}) {
  const appContext = useContext(ContextProvider)

  return (
    <ContextProvider.Provider
      value={{
        ...appContext,
        currentCustomCategories: selected,
        customCategories: {
          ...appContext.customCategories,
          listCategories: () => categories
        }
      }}
    >
      {children}
    </ContextProvider.Provider>
  )
}

const meta = {
  title: 'Patterns/CategoryFilter',
  component: CategoryFilter,
  parameters: {
    docs: {
      description: {
        component:
          'Dropdown that filters the library by the user’s own categories. Each chip has an "only" shortcut that narrows the selection to a single category.'
      }
    }
  }
} satisfies Meta<typeof CategoryFilter>

export default meta

type Story = StoryObj<typeof meta>

export const WithCustomCategories: Story = {
  render: () => (
    <WithCategories
      categories={['Favourites', 'Backlog', 'Finished', 'Co-op']}
      selected={['Favourites']}
    >
      <CategoryFilter />
    </WithCategories>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Categories' }))

    await expect(
      canvas.getByRole('button', { name: 'Favourites' })
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(
      canvas.getByRole('button', { name: 'Backlog' })
    ).toHaveAttribute('aria-pressed', 'false')
  }
}

export const WithoutCategories: Story = {
  render: () => (
    <WithCategories categories={[]}>
      <CategoryFilter />
    </WithCategories>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/No custom categories/)).toBeInTheDocument()
  }
}
