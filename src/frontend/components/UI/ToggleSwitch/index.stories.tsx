import { useState } from 'react'
import { expect, fn } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import ToggleSwitch from '.'

const meta = {
  title: 'Forms/ToggleSwitch',
  component: ToggleSwitch,
  args: {
    htmlId: 'toggle-story',
    title: 'Minimise on game launch',
    value: false,
    handleChange: fn()
  }
} satisfies Meta<typeof ToggleSwitch>

export default meta

type Story = StoryObj<typeof meta>

export const Off: Story = {}

export const On: Story = {
  args: { value: true }
}

export const Disabled: Story = {
  args: { disabled: true, value: true }
}

export const WithDescription: Story = {
  args: {
    description: 'Hides the Heroic window while a game is running.'
  }
}

export const WithInfo: Story = {
  args: {
    info: 'Some window managers ignore this on Wayland.'
  }
}

function ControlledToggle() {
  const [value, setValue] = useState(false)

  return (
    <ToggleSwitch
      handleChange={() => setValue(!value)}
      htmlId="controlled-toggle"
      title="Discord rich presence"
      value={value}
    />
  )
}

export const TogglesOnClick: Story = {
  render: () => <ControlledToggle />,
  play: async ({ canvas, userEvent }) => {
    const toggle = canvas.getByRole('checkbox', {
      name: 'Discord rich presence'
    })

    await expect(toggle).not.toBeChecked()
    await userEvent.click(toggle)
    await expect(toggle).toBeChecked()
  }
}

export const DisabledDoesNotChange: Story = {
  args: { disabled: true },
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole('checkbox')).toBeDisabled()
    await expect(args.handleChange).not.toHaveBeenCalled()
  }
}
