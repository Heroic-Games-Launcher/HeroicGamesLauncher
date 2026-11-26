import { ReactNode, useContext, useState } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'
import { expect, waitFor } from 'storybook/test'
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
  const [currentCategories, setCurrentCategories] = useState(selected)

  return (
    <ContextProvider.Provider
      value={{
        ...appContext,
        currentCustomCategories: currentCategories,
        setCurrentCustomCategories: setCurrentCategories,
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
          'Dropdown that filters the library by the user’s own categories. Categories are listed with checkboxes, and each row reveals an "only" shortcut on hover that narrows the selection to a single category.'
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
    await expect(
      canvas.getByLabelText('1 category selected')
    ).toHaveTextContent('1')

    await userEvent.click(canvas.getByRole('button', { name: /Categories/ }))

    const favourites = canvas.getByRole('checkbox', { name: 'Favourites' })
    const backlog = canvas.getByRole('checkbox', { name: 'Backlog' })
    await expect(favourites).toBeChecked()
    await expect(backlog).not.toBeChecked()

    await userEvent.click(backlog)
    await expect(backlog).toBeChecked()
    await expect(
      canvas.getByLabelText('2 categories selected')
    ).toHaveTextContent('2')

    const only = canvas.getByRole('button', { name: 'only: Backlog' })
    await waitFor(() => expect(only).toBeVisible())
    await userEvent.click(only)

    await expect(favourites).not.toBeChecked()
    await expect(backlog).toBeChecked()
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
    await expect(
      canvas.queryByLabelText(/category selected/)
    ).not.toBeInTheDocument()
  }
}
