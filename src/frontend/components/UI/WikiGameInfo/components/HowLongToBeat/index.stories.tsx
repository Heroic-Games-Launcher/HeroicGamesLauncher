import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import HowLongToBeat from '.'

const meta = {
  title: 'Data Display/HowLongToBeat',
  component: HowLongToBeat,
  args: {
    info: {
      mainStory: 27,
      mainExtra: 39,
      completionist: 62,
      gameWebLink: 'https://howlongtobeat.com/game/26286'
    }
  },
  parameters: {
    docs: {
      description: {
        component:
          'Play time estimates on the game page, pulled from HowLongToBeat. Each figure is a StatCard that links back to the source when one is available.'
      }
    }
  }
} satisfies Meta<typeof HowLongToBeat>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithoutWebLink: Story = {
  args: {
    info: {
      mainStory: 8,
      mainExtra: 12,
      completionist: 20,
      gameWebLink: ''
    }
  }
}

export const ShowsThreeEstimates: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('27 Hours')).toBeInTheDocument()
    await expect(canvas.getByText('39 Hours')).toBeInTheDocument()
    await expect(canvas.getByText('62 Hours')).toBeInTheDocument()
  }
}
