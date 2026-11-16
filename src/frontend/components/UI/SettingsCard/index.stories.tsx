import { Gamepad2, Wine } from 'lucide-react'
import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import SettingsCard from '.'
import Badge from '../Badge'
import Button from '../Button'
import SettingRow from '../SettingRow'
import ToggleSwitch from '../ToggleSwitch'

const meta = {
  title: 'Data Display/SettingsCard',
  component: SettingsCard,
  args: {
    title: 'Wine',
    glyph: Wine,
    children: (
      <>
        <ToggleSwitch
          handleChange={() => undefined}
          htmlId="settings-card-dxvk"
          title="Enable DXVK"
          value
        />
        <ToggleSwitch
          handleChange={() => undefined}
          htmlId="settings-card-esync"
          title="Enable Esync"
          value={false}
        />
      </>
    )
  },
  argTypes: {
    glyph: { table: { disable: true } }
  },
  parameters: {
    docs: {
      description: {
        component:
          'A titled group of settings. Every section of the settings screen is one of these, so headings, descriptions and spacing stay identical across tabs.'
      }
    }
  }
} satisfies Meta<typeof SettingsCard>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithDescription: Story = {
  args: {
    description:
      'These options only apply to games launched through Wine or Proton.'
  }
}

export const WithMeta: Story = {
  args: { meta: <Badge variant="info">Advanced</Badge> }
}

export const WithActions: Story = {
  args: {
    actions: (
      <Button size="sm" variant="ghost">
        Reset
      </Button>
    )
  }
}

export const WithMixedRows: Story = {
  args: {
    title: 'Controller',
    glyph: Gamepad2,
    children: (
      <>
        <SettingRow
          description="Shows the button hints at the bottom of the window."
          label="Controller hints"
        >
          <Button size="sm" variant="ghost">
            Configure
          </Button>
        </SettingRow>
        <ToggleSwitch
          handleChange={() => undefined}
          htmlId="settings-card-gamepad"
          title="Gamepad navigation"
          value
        />
      </>
    )
  }
}

export const TitleIsAHeading: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: 'Wine' })
    ).toBeInTheDocument()
  }
}
