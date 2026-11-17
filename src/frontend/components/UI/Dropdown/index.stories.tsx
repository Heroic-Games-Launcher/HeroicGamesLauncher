import { ChevronDown, LayoutGrid } from 'lucide-react'
import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import Dropdown from '.'
import Chip from '../Chip'
import FilterSection from '../FilterSection'
import Icon from '../Icon'

const meta = {
  title: 'Navigation/Dropdown',
  component: Dropdown,
  args: {
    title: (
      <>
        <Icon glyph={LayoutGrid} size="md" />
        <span>Categories</span>
        <Icon glyph={ChevronDown} size="sm" />
      </>
    ),
    buttonClass: 'pill',
    children: (
      <FilterSection>
        <Chip active>Favourites</Chip>
        <Chip>Backlog</Chip>
        <Chip>Finished</Chip>
        <Chip>Uncategorized</Chip>
      </FilterSection>
    )
  },
  parameters: {
    docs: {
      description: {
        component:
          'The library filter dropdown. It can open on click or on hover, and closes when focus leaves the panel so controller navigation does not get trapped.'
      }
    }
  }
} satisfies Meta<typeof Dropdown>

export default meta

type Story = StoryObj<typeof meta>

export const Collapsed: Story = {}

export const PopUpOnHover: Story = {
  args: { popUpOnHover: true }
}

export const OpensOnClick: Story = {
  play: async ({ canvasElement, canvas, userEvent }) => {
    await expect(canvasElement.querySelector('.dropdown')).toHaveClass(
      'collapsed'
    )

    await userEvent.click(canvas.getByRole('button', { name: /Categories/ }))

    await expect(canvasElement.querySelector('.dropdown')).toHaveClass(
      'expanded'
    )
  }
}
