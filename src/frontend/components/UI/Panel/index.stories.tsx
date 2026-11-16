import type { Meta, StoryObj } from '@storybook/react-vite'

import Panel from '.'

const tones = ['translucent', 'solid', 'glass'] as const
const paddings = ['none', 'sm', 'md', 'lg'] as const

const meta = {
  title: 'Atoms/Panel',
  component: Panel,
  args: {
    children: 'Panel content',
    tone: 'translucent',
    padding: 'md'
  },
  argTypes: {
    tone: { control: 'inline-radio', options: tones },
    padding: { control: 'inline-radio', options: paddings }
  },
  parameters: {
    docs: {
      description: {
        component:
          'The surface every card in the app is built on. StatCard, SpecCard and SettingsCard all compose it.'
      }
    }
  }
} satisfies Meta<typeof Panel>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Tones: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      {tones.map((tone) => (
        <Panel {...args} key={tone} tone={tone}>
          {tone}
        </Panel>
      ))}
    </div>
  )
}

export const Paddings: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      {paddings.map((padding) => (
        <Panel {...args} key={padding} padding={padding}>
          {padding}
        </Panel>
      ))}
    </div>
  )
}
