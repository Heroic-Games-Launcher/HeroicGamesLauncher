import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import ActionIcons from '.'

const meta = {
  title: 'Patterns/ActionIcons',
  component: ActionIcons,
  parameters: {
    docs: {
      description: {
        component:
          'The segmented control in the library header: layout toggle, sort direction, sort by install state, the alphabet filter and a library refresh.'
      }
    }
  }
} satisfies Meta<typeof ActionIcons>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const ExposesEveryAction: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: /Toggle to a list layout/i })
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole('button', { name: /Sort by Status/i })
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole('button', { name: /Refresh Library/i })
    ).toBeInTheDocument()
  }
}
