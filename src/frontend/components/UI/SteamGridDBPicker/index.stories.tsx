import type { SGDBGame } from 'common/types'
import { expect, fn } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import SteamGridDBPicker from '.'

const games: SGDBGame[] = [
  { id: 1, name: 'Hollow Knight' },
  { id: 2, name: 'Hollow Knight: Silksong' }
]

const meta = {
  title: 'Overlays/SteamGridDBPicker',
  component: SteamGridDBPicker,
  args: {
    initialTitle: 'Hollow Knight',
    onSelect: fn(),
    onClose: fn()
  },
  argTypes: {
    mode: { control: 'inline-radio', options: ['grids', 'heroes'] }
  },
  parameters: {
    docs: {
      description: {
        component:
          'Artwork browser backed by SteamGridDB. Without an API key configured it only shows the key prompt, which is the first story here.'
      }
    }
  }
} satisfies Meta<typeof SteamGridDBPicker>

export default meta

type Story = StoryObj<typeof meta>

export const WithoutApiKey: Story = {}

export const SearchResults: Story = {
  beforeEach: () => {
    const original = window.api.steamgriddb
    window.api.steamgriddb = {
      ...original,
      hasApiKey: () => Promise.resolve(true),
      searchGame: () => Promise.resolve(games)
    }
    return () => {
      window.api.steamgriddb = original
    }
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByDisplayValue('Hollow Knight')
    ).toBeInTheDocument()
  }
}

export const HeroesMode: Story = {
  args: { mode: 'heroes' }
}
