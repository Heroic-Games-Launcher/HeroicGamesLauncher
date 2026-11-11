import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import InfoBox from '.'
import DetailList from '../DetailList'

const meta = {
  title: 'Overlays/InfoBox',
  component: InfoBox,
  args: {
    text: 'infobox.requirements',
    children: (
      <DetailList
        items={[
          { label: 'OS', value: 'Windows 10 64-bit' },
          { label: 'CPU', value: 'Intel Core i5-2300' },
          { label: 'Memory', value: '8 GB RAM' }
        ]}
      />
    )
  },
  parameters: {
    docs: {
      description: {
        component:
          'A labelled link that reveals a popover. The text prop is a translation key, which is why the trigger copy is localised but the body is not.'
      }
    }
  }
} satisfies Meta<typeof InfoBox>

export default meta

type Story = StoryObj<typeof meta>

export const Requirements: Story = {}

export const Help: Story = {
  args: {
    text: 'infobox.help',
    children: <p>Check the wiki for a walkthrough of the Wine settings.</p>
  }
}

export const Warning: Story = {
  args: {
    text: 'infobox.warning',
    children: <p>Do not use CSS files from untrusted sources.</p>
  }
}

export const OpensThePopover: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await expect(canvasElement.querySelector('.popover')).toBeNull()

    await userEvent.click(canvas.getByText(/requirements/i))

    await expect(canvasElement.querySelector('.popover')).not.toBeNull()
  }
}
