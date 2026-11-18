import { expect, fn } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import SettingsSearch from '.'

const meta = {
  title: 'Forms/SettingsSearch',
  component: SettingsSearch,
  args: {
    onSelect: fn()
  },
  parameters: {
    docs: {
      description: {
        component:
          'Searches the main global settings by name and jumps to the matching row when a result is chosen.'
      }
    }
  }
} satisfies Meta<typeof SettingsSearch>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const FindsASettingByName: Story = {
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByRole('combobox')

    await userEvent.type(input, 'discord')
    await expect(
      await canvas.findByRole('option', { name: /Discord rich presence/i })
    ).toBeInTheDocument()
  }
}

export const SelectsWithEnter: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const input = canvas.getByRole('combobox')

    await userEvent.type(input, 'discord{Enter}')
    await expect(args.onSelect).toHaveBeenCalledTimes(1)
    await expect(input).toHaveValue('')
  }
}

export const NoResults: Story = {
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByRole('combobox')

    await userEvent.type(input, 'definitely not a setting')
    await expect(
      await canvas.findByText('No settings found')
    ).toBeInTheDocument()
  }
}

export const SlashFocusesTheInput: Story = {
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByRole('combobox')

    await expect(input).not.toHaveFocus()
    await userEvent.keyboard('/')
    await expect(input).toHaveFocus()
  }
}
