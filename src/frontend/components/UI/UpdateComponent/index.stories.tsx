import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import UpdateComponent from '.'

const meta = {
  title: 'Feedback/UpdateComponent',
  component: UpdateComponent,
  args: {
    message: 'Loading your library'
  },
  argTypes: {
    progress: { control: { type: 'range', min: 0, max: 100, step: 1 } }
  },
  parameters: {
    docs: {
      description: {
        component:
          'The full page loading state. Without a progress value the bar runs indeterminate, which is what the library refresh uses.'
      }
    }
  }
} satisfies Meta<typeof UpdateComponent>

export default meta

type Story = StoryObj<typeof meta>

export const Indeterminate: Story = {}

export const WithProgress: Story = {
  args: { progress: 64, message: 'Syncing cloud saves' }
}

export const Inline: Story = {
  args: { inline: true, message: 'Checking for updates' }
}

export const AnnouncesItsStatus: Story = {
  play: async ({ canvas }) => {
    const status = canvas.getByRole('status')

    await expect(status).toHaveAttribute('aria-live', 'polite')
    await expect(status).toHaveTextContent('Loading your library')
  }
}
