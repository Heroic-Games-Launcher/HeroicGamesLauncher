import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import SettingRow from '.'
import Button from '../Button'
import InfoTooltip from '../InfoTooltip'

const meta = {
  title: 'Forms/SettingRow',
  component: SettingRow,
  args: {
    label: 'Enable DXVK',
    children: <Button size="sm">Change</Button>
  },
  argTypes: {
    layout: { control: 'inline-radio', options: ['inline', 'stacked'] }
  },
  parameters: {
    docs: {
      description: {
        component:
          'The label/description/control layout shared by every setting. ToggleSwitch and the select fields render through it, so a single change keeps the settings screens aligned.'
      }
    }
  }
} satisfies Meta<typeof SettingRow>

export default meta

type Story = StoryObj<typeof meta>

export const Inline: Story = {}

export const Stacked: Story = {
  args: { layout: 'stacked' }
}

export const WithDescription: Story = {
  args: {
    description:
      'Translates DirectX calls to Vulkan. Recommended for most Windows games.'
  }
}

export const WithLabelAfter: Story = {
  args: {
    labelAfter: (
      <InfoTooltip
        content="Only applies to games running through Wine or Proton."
        label="Enable DXVK"
      />
    )
  }
}

export const LabelIsBoundToControl: Story = {
  args: {
    htmlFor: 'dxvk-toggle',
    children: <input id="dxvk-toggle" type="checkbox" />
  },
  play: async ({ canvas, userEvent }) => {
    const checkbox = canvas.getByRole('checkbox')

    await expect(checkbox).not.toBeChecked()
    await userEvent.click(canvas.getByText('Enable DXVK'))
    await expect(checkbox).toBeChecked()
  }
}
