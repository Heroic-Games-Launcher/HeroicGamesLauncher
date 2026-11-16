import { useState } from 'react'
import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import SearchBar from '.'

const meta = {
  title: 'Forms/SearchBar',
  component: SearchBar,
  args: {
    placeholder: 'Search for a game',
    value: '',
    onInputChanged: () => undefined
  },
  parameters: {
    docs: {
      description: {
        component:
          'The library search input. Pressing / anywhere focuses it and Escape blurs it, so it is also the keyboard entry point into the library.'
      }
    }
  }
} satisfies Meta<typeof SearchBar>

export default meta

type Story = StoryObj<typeof meta>

function Controlled({
  suggestions = [],
  ...props
}: Parameters<typeof SearchBar>[0] & { suggestions?: string[] }) {
  const [value, setValue] = useState(props.value)
  const matches = suggestions.filter((item) =>
    item.toLowerCase().includes(value.toLowerCase())
  )

  return (
    <SearchBar
      {...props}
      onInputChanged={setValue}
      suggestionsListItems={
        value ? matches.map((item) => <li key={item}>{item}</li>) : []
      }
      value={value}
    />
  )
}

export const Default: Story = {
  render: (args) => <Controlled {...args} />
}

export const WithSuggestions: Story = {
  render: (args) => (
    <Controlled
      {...args}
      suggestions={[
        'Hollow Knight',
        'Hades',
        'Celeste',
        'Cyberpunk 2077',
        'Baldur’s Gate 3'
      ]}
    />
  )
}

export const ClearButtonResetsTheQuery: Story = {
  render: (args) => <Controlled {...args} />,
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByTestId('searchInput')

    await userEvent.type(input, 'hades')
    await expect(input).toHaveValue('hades')

    await userEvent.click(canvas.getByRole('button'))
    await expect(input).toHaveValue('')
  }
}

export const SlashFocusesTheInput: Story = {
  render: (args) => <Controlled {...args} />,
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByTestId('searchInput')

    await expect(input).not.toHaveFocus()
    await userEvent.keyboard('/')
    await expect(input).toHaveFocus()
  }
}
