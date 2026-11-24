import { useState } from 'react'
import { expect, screen } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import MultiSelectField from '.'

const genres = [
  { value: 'action', label: 'Action' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'rpg', label: 'RPG' },
  { value: 'strategy', label: 'Strategy' },
  { value: 'simulation', label: 'Simulation' }
]

const meta = {
  title: 'Forms/MultiSelectField',
  component: MultiSelectField,
  args: {
    htmlId: 'multi-select-field-story',
    label: 'Genres',
    placeholder: 'Any genre',
    options: genres,
    values: [],
    onChange: () => undefined
  }
} satisfies Meta<typeof MultiSelectField>

export default meta

type Story = StoryObj<typeof meta>

function Controlled(props: Parameters<typeof MultiSelectField>[0]) {
  const [values, setValues] = useState(props.values)

  return <MultiSelectField {...props} values={values} onChange={setValues} />
}

export const Default: Story = {
  render: (args) => <Controlled {...args} />
}

export const WithSelection: Story = {
  render: (args) => <Controlled {...args} values={['action', 'rpg']} />
}

export const Disabled: Story = {
  render: (args) => <Controlled {...args} values={['action']} disabled />
}

export const SelectingOptionsUpdatesTheValue: Story = {
  render: (args) => <Controlled {...args} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('combobox'))

    const action = await screen.findByRole('option', { name: 'Action' })
    const rpg = await screen.findByRole('option', { name: 'RPG' })
    await userEvent.click(action)
    await userEvent.click(rpg)
    await userEvent.keyboard('{Escape}')

    await expect(canvas.getByRole('combobox')).toHaveTextContent('Action, RPG')
  }
}
