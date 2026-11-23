import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import PopoverComponent from '.'
import Button from '../Button'
import MenuItem from '../MenuItem'

const meta = {
  title: 'Overlays/PopoverComponent',
  component: PopoverComponent,
  args: {
    item: <Button variant="ghost">More actions</Button>,
    children: (
      <>
        <MenuItem>Add to favourites</MenuItem>
        <MenuItem>Create a shortcut</MenuItem>
        <MenuItem tone="danger">Hide from library</MenuItem>
      </>
    )
  },
  parameters: {
    docs: {
      description: {
        component:
          'Click-to-open popover that closes when you click outside it. The trigger element is cloned, so it receives the onClick handler for free.'
      }
    }
  }
} satisfies Meta<typeof PopoverComponent>

export default meta

type Story = StoryObj<typeof meta>

export const Closed: Story = {}

export const TogglesOnTriggerClick: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: 'More actions' })

    await userEvent.click(trigger)
    await expect(canvasElement.querySelector('.popover')).not.toBeNull()

    await userEvent.click(trigger)
    await expect(canvasElement.querySelector('.popover')).toBeNull()
  }
}

export const ClosesOnOutsideClick: Story = {
  render: (args) => (
    <div>
      <PopoverComponent {...args} />
      <p data-testid="outside">Click here to dismiss the popover</p>
    </div>
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'More actions' }))
    await expect(canvasElement.querySelector('.popover')).not.toBeNull()

    await userEvent.click(canvas.getByTestId('outside'))
    await expect(canvasElement.querySelector('.popover')).toBeNull()
  }
}
