import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import Help from '.'

const meta = {
  title: 'Overlays/Help',
  component: Help,
  args: {
    items: {
      wine: {
        title: 'Wine version',
        content: <p>Pick the Wine or Proton build used to run this game.</p>
      },
      dxvk: {
        title: 'DXVK',
        content: (
          <p>Translates DirectX calls to Vulkan for better performance.</p>
        )
      },
      saves: {
        title: 'Cloud saves',
        content: <p>Sync your save files with the store that owns the game.</p>
      }
    }
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The contextual help panel toggled from the corner of the window. Each screen registers its own entries through the hasHelp hook.'
      }
    }
  }
} satisfies Meta<typeof Help>

export default meta

type Story = StoryObj<typeof meta>

export const Closed: Story = {}

export const OpensOnClick: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByTitle('Open help'))

    await expect(canvasElement.querySelector('.HelpContent')).toHaveClass(
      'open'
    )
    await expect(canvas.getByText('Cloud saves')).toBeInTheDocument()
  }
}
