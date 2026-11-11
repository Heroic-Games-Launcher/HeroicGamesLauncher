import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import InfoIcon from '.'

const meta = {
  title: 'Overlays/InfoIcon',
  component: InfoIcon,
  args: {
    text: 'This game runs natively on Linux.'
  }
} satisfies Meta<typeof InfoIcon>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const ExampleTexts: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <InfoIcon text="This game runs natively on Linux." />
      <InfoIcon text="Enabling this may improve performance on some systems, but can cause crashes on others." />
      <InfoIcon text="Requires a restart of Heroic to take effect." />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The icon exposes its text through a native tooltip on hover. The same text is revealed inline when the icon is reached with a controller.'
      }
    }
  }
}

export const ShowsTheTextNextToTheIcon: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvas.getByText('This game runs natively on Linux.')
    ).toBeInTheDocument()
    await expect(canvasElement.querySelector('svg.helpIcon')).not.toBeNull()
  }
}
