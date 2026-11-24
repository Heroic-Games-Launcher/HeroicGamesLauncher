import { expect, screen } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import InfoTooltip from '.'

const meta = {
  title: 'Overlays/InfoTooltip',
  component: InfoTooltip,
  args: {
    content: 'Translates DirectX calls to Vulkan.',
    label: 'Enable DXVK'
  },
  parameters: {
    docs: {
      description: {
        component:
          'The little info icon that sits next to setting labels. It is focusable and exposes role="note" so keyboard users reach the same explanation.'
      }
    }
  }
} satisfies Meta<typeof InfoTooltip>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithRichContent: Story = {
  args: {
    content: (
      <>
        <p>Heroic ships several Wine builds.</p>
        <p>Install more from the Wine manager.</p>
      </>
    ),
    label: 'Wine version'
  }
}

export const IsReachableByKeyboard: Story = {
  play: async ({ canvas, userEvent }) => {
    const note = canvas.getByRole('note', { name: 'Enable DXVK' })

    await userEvent.tab()
    await expect(note).toHaveFocus()
    await expect(
      await screen.findByText('Translates DirectX calls to Vulkan.')
    ).toBeInTheDocument()
  }
}
