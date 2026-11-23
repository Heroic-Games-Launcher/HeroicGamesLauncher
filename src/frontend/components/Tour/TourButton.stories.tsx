import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import TourButton from './TourButton'

const meta = {
  title: 'Patterns/TourButton',
  component: TourButton,
  args: {
    tourId: 'library-tour'
  },
  parameters: {
    docs: {
      description: {
        component:
          'Restarts the guided tour registered for a screen. Pressing it on a tour that already completed resets the progress first.'
      }
    }
  }
} satisfies Meta<typeof TourButton>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithCustomLabel: Story = {
  args: { label: 'Show me around the library' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Show me around the library' })
    ).toBeInTheDocument()
  }
}
