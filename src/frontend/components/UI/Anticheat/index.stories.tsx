import type { AntiCheatInfo } from 'common/types'
import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import Anticheat from '.'

const base: AntiCheatInfo = {
  status: 'Supported',
  anticheats: ['Easy Anti-Cheat'],
  notes: [],
  native: false,
  storeIds: {},
  reference: 'https://areweanticheatyet.com/',
  updates: []
}

const meta = {
  title: 'Feedback/Anticheat',
  component: Anticheat,
  args: { anticheatInfo: base },
  parameters: {
    docs: {
      description: {
        component:
          'Anticheat compatibility notice shown on the game page, sourced from AreWeAntiCheatYet. It is an Alert with the variant picked from the status, so it reads the same as every other inline message. Passing null renders nothing.'
      }
    }
  }
} satisfies Meta<typeof Anticheat>

export default meta

type Story = StoryObj<typeof meta>

export const Supported: Story = {}

export const Running: Story = {
  args: { anticheatInfo: { ...base, status: 'Running' } }
}

export const Broken: Story = {
  args: {
    anticheatInfo: {
      ...base,
      status: 'Broken',
      anticheats: ['BattlEye', 'Easy Anti-Cheat']
    }
  }
}

export const Denied: Story = {
  args: { anticheatInfo: { ...base, status: 'Denied' } }
}

export const AnticheatRemoved: Story = {
  args: { anticheatInfo: { ...base, anticheats: [] } }
}

export const NothingWhenUnknown: Story = {
  args: { anticheatInfo: null },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.anticheatInfo')).toBeNull()
  }
}

export const UsesTheAlertComponent: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.Alert')).not.toBeNull()
  }
}
