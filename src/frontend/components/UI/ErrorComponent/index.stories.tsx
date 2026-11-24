import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import ErrorComponent from '.'

const meta = {
  title: 'Feedback/ErrorComponent',
  component: ErrorComponent,
  args: {
    message: 'We could not reach the Epic Games servers.'
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The recovery screen shown when the library fails to load. It offers the three escape hatches: refresh, clear the cache, reset Heroic.'
      }
    }
  }
} satisfies Meta<typeof ErrorComponent>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const OffersRecoveryActions: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: /Refresh Library/i })
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole('button', { name: /Clear Heroic Cache/i })
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole('button', { name: /Reset Heroic/i })
    ).toBeInTheDocument()
  }
}
