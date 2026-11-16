import { ArrowDownAZ, LayoutGrid, List, Search } from 'lucide-react'
import { expect, fn } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import FormControl from '.'
import Icon from '../Icon'

const meta = {
  title: 'Forms/FormControl',
  component: FormControl,
  args: {
    children: <input placeholder="Search" />
  },
  parameters: {
    docs: {
      description: {
        component:
          'The chrome around a control: borders, a caret for selects, a clear button, and the segmented variant used by the library action icons.'
      }
    }
  }
} satisfies Meta<typeof FormControl>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Small: Story = {
  args: { small: true }
}

export const Select: Story = {
  args: {
    select: true,
    children: (
      <select>
        <option>Alphabetical</option>
        <option>Recently played</option>
        <option>Install size</option>
      </select>
    )
  }
}

export const Clearable: Story = {
  args: { onClear: fn() }
}

export const WithLeftButton: Story = {
  args: {
    leftButton: <Icon glyph={Search} size="sm" />
  }
}

export const Segmented: Story = {
  args: {
    segmented: true,
    small: true,
    children: (
      <>
        <button className="FormControl__button">
          <Icon className="FormControl__segmentedLucideIcon" glyph={List} />
        </button>
        <button className="FormControl__button">
          <Icon
            className="FormControl__segmentedLucideIcon"
            glyph={LayoutGrid}
          />
        </button>
        <button className="FormControl__button">
          <Icon
            className="FormControl__segmentedLucideIcon"
            glyph={ArrowDownAZ}
          />
        </button>
      </>
    )
  }
}

export const ClearButtonFires: Story = {
  args: { onClear: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button'))
    await expect(args.onClear).toHaveBeenCalledTimes(1)
  }
}
