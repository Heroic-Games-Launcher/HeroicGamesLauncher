import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import RangeSlider from '.'

const meta = {
  title: 'Forms/RangeSlider',
  component: RangeSlider,
  args: {
    min: 0,
    max: 215,
    step: 1,
    value: [0, 215],
    onChange: () => undefined
  },
  decorators: [
    (Story) => (
      <div style={{ width: 320, padding: 24 }}>
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof RangeSlider>

export default meta

type Story = StoryObj<typeof meta>

function Controlled(props: Parameters<typeof RangeSlider>[0]) {
  const [value, setValue] = useState(props.value)

  return <RangeSlider {...props} value={value} onChange={setValue} />
}

export const Price: Story = {
  render: (args) => (
    <Controlled
      {...args}
      valueLabel={`BRL ${args.value[0]} – ${args.value[1]}`}
      minLabel="BRL 0"
      maxLabel="BRL 215"
    />
  )
}

export const Rating: Story = {
  args: { min: 0, max: 10, step: 0.5, value: [6, 10] },
  render: (args) => (
    <Controlled
      {...args}
      valueLabel={`${args.value[0].toFixed(1)} – ${args.value[1].toFixed(1)}`}
      minLabel="0.0"
      maxLabel="10.0"
    />
  )
}

export const Disabled: Story = {
  render: (args) => (
    <Controlled {...args} disabled valueLabel="BRL 0 – 215" />
  )
}
