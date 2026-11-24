import { useState } from 'react'
import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import Checkbox from '.'

const meta = {
  title: 'Forms/Checkbox',
  component: Checkbox,
  args: {
    checked: false
  }
} satisfies Meta<typeof Checkbox>

export default meta

type Story = StoryObj<typeof meta>

function Controlled(props: Parameters<typeof Checkbox>[0]) {
  const [checked, setChecked] = useState(Boolean(props.checked))

  return (
    <Checkbox
      {...props}
      checked={checked}
      onChange={(event) => setChecked(event.target.checked)}
    />
  )
}

export const Unchecked: Story = {
  render: (args) => <Controlled {...args} />
}

export const Checked: Story = {
  render: (args) => <Controlled {...args} checked />
}

export const Disabled: Story = {
  render: (args) => <Controlled {...args} checked disabled />
}

export const Toggles: Story = {
  render: (args) => <Controlled {...args} />,
  play: async ({ canvas, userEvent }) => {
    const checkbox = canvas.getByRole('checkbox')
    await expect(checkbox).not.toBeChecked()
    await userEvent.click(checkbox)
    await expect(checkbox).toBeChecked()
  }
}
