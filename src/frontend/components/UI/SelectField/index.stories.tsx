import { useState } from 'react'
import { MenuItem } from '@mui/material'
import { expect, screen } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import SelectField from '.'

const languages = [
  { value: 'en', label: 'English' },
  { value: 'pt_BR', label: 'Português (Brasil)' },
  { value: 'de', label: 'Deutsch' },
  { value: 'ja', label: '日本語' }
]

const meta = {
  title: 'Forms/SelectField',
  component: SelectField,
  args: {
    htmlId: 'select-field-story',
    label: 'App language',
    value: 'en',
    onChange: () => undefined,
    children: languages.map(({ value, label }) => (
      <MenuItem key={value} value={value}>
        {label}
      </MenuItem>
    ))
  }
} satisfies Meta<typeof SelectField>

export default meta

type Story = StoryObj<typeof meta>

function Controlled(props: Parameters<typeof SelectField>[0]) {
  const [value, setValue] = useState(props.value)

  return (
    <SelectField
      {...props}
      onChange={(event) => setValue(event.target.value)}
      value={value}
    />
  )
}

export const Default: Story = {
  render: (args) => <Controlled {...args} />
}

export const WithInfo: Story = {
  render: (args) => (
    <Controlled
      {...args}
      info="Heroic falls back to English for any missing translation."
    />
  )
}

export const WithPrompt: Story = {
  render: (args) => <Controlled {...args} prompt="Pick a language" value="" />
}

export const Disabled: Story = {
  render: (args) => <Controlled {...args} disabled />
}

export const SelectingAnOptionUpdatesTheValue: Story = {
  render: (args) => <Controlled {...args} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('combobox'))

    const option = await screen.findByRole('option', { name: 'Deutsch' })
    await userEvent.click(option)

    await expect(canvas.getByRole('combobox')).toHaveTextContent('Deutsch')
  }
}
