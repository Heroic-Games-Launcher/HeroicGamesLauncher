import { useState } from 'react'
import { Search } from 'lucide-react'
import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import TextInputField from '.'
import Icon from '../Icon'
import Alert from '../Alert'

const meta = {
  title: 'Forms/TextInputField',
  component: TextInputField,
  args: {
    htmlId: 'text-input-story',
    label: 'Alternative executable',
    placeholder: '/path/to/game.exe',
    value: '',
    onChange: () => undefined
  },
  parameters: {
    docs: {
      description: {
        component:
          'Text field used across the settings screens. It listens to native input events rather than React onChange so the on-screen keyboard used in console mode keeps working.'
      }
    }
  }
} satisfies Meta<typeof TextInputField>

export default meta

type Story = StoryObj<typeof meta>

function Controlled({
  initialValue = '',
  ...props
}: Omit<Parameters<typeof TextInputField>[0], 'onChange' | 'value'> & {
  initialValue?: string
}) {
  const [value, setValue] = useState(initialValue)

  return <TextInputField {...props} onChange={setValue} value={value} />
}

export const Default: Story = {
  render: (args) => <Controlled {...args} />
}

export const WithValue: Story = {
  render: (args) => <Controlled {...args} initialValue="C:\\Games\\game.exe" />
}

export const WithInfo: Story = {
  render: (args) => (
    <Controlled
      {...args}
      info="Leave empty to launch the executable detected by Heroic."
    />
  )
}

export const WithIcon: Story = {
  render: (args) => (
    <Controlled {...args} inputIcon={<Icon glyph={Search} size="md" />} />
  )
}

export const WithWarning: Story = {
  render: (args) => (
    <Controlled
      {...args}
      initialValue="/nope"
      warning={<Alert variant="warning">That path does not exist.</Alert>}
    />
  )
}

export const Disabled: Story = {
  render: (args) => <Controlled {...args} disabled />
}

export const TypingUpdatesTheValue: Story = {
  render: (args) => <Controlled {...args} />,
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByLabelText('Alternative executable')

    await userEvent.type(input, 'wine')
    await expect(input).toHaveValue('wine')
  }
}
