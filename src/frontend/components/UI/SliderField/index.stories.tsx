import { useState } from 'react'
import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import SliderField from '.'

const meta = {
  title: 'Forms/SliderField',
  component: SliderField,
  args: {
    htmlId: 'slider-field-story',
    label: 'Zoom',
    value: 100,
    min: 60,
    max: 200,
    step: 10
  }
} satisfies Meta<typeof SliderField>

export default meta

type Story = StoryObj<typeof meta>

function Controlled(props: Parameters<typeof SliderField>[0]) {
  const [value, setValue] = useState(props.value)

  return <SliderField {...props} onChange={setValue} value={value} />
}

export const Default: Story = {
  render: (args) => <Controlled {...args} />
}

export const WithMinMaxMarks: Story = {
  render: (args) => <Controlled {...args} showMinMaxMarks />
}

export const WithCustomMarks: Story = {
  render: (args) => (
    <Controlled
      {...args}
      marks={[
        { value: 60, label: '60%' },
        { value: 100, label: '100%' },
        { value: 150, label: '150%' },
        { value: 200, label: '200%' }
      ]}
    />
  )
}

export const Disabled: Story = {
  render: (args) => <Controlled {...args} disabled />
}

export const ExposesTheValueToAssistiveTech: Story = {
  render: (args) => <Controlled {...args} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('slider')).toHaveAttribute(
      'aria-valuenow',
      '100'
    )
  }
}
