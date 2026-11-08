import { useState } from 'react'
import { Folder } from 'lucide-react'
import { expect, fn } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import TextInputWithIconField from '.'
import Icon from '../Icon'

const meta = {
  title: 'Forms/TextInputWithIconField',
  component: TextInputWithIconField,
  args: {
    htmlId: 'text-input-icon-story',
    label: 'Default install path',
    placeholder: '~/Games/Heroic',
    icon: <Icon glyph={Folder} size="md" />,
    onIconClick: fn(),
    value: '',
    onChange: () => undefined
  }
} satisfies Meta<typeof TextInputWithIconField>

export default meta

type Story = StoryObj<typeof meta>

function Controlled(props: Parameters<typeof TextInputWithIconField>[0]) {
  const [value, setValue] = useState(props.value)

  return <TextInputWithIconField {...props} onChange={setValue} value={value} />
}

export const Default: Story = {
  render: (args) => <Controlled {...args} />
}

export const Disabled: Story = {
  render: (args) => <Controlled {...args} disabled />
}

export const IconIsClickable: Story = {
  render: (args) => <Controlled {...args} />,
  play: async ({ args, canvas, userEvent }) => {
    const buttons = canvas.getAllByRole('button')

    await userEvent.click(buttons[0])
    await expect(args.onIconClick).toHaveBeenCalledTimes(1)
  }
}
