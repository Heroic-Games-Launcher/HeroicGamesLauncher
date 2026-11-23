import type { Meta, StoryObj } from '@storybook/react-vite'

import Stepper from '.'

const steps = [
  { title: 'Metadata', description: 'Name and platform' },
  { title: 'Images', description: 'Cover and hero art' },
  { title: 'Compatibility', description: 'Wine / Proton setup' },
  { title: 'Installation', description: 'Run the installer' },
  { title: 'Finish', description: 'Executable and options' }
]

const meta = {
  title: 'Atoms/Stepper',
  component: Stepper,
  args: {
    steps,
    activeStep: 1
  },
  argTypes: {
    activeStep: {
      control: { type: 'range', min: 0, max: steps.length - 1, step: 1 }
    }
  }
} satisfies Meta<typeof Stepper>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const FirstStep: Story = {
  args: { activeStep: 0 }
}

export const LastStep: Story = {
  args: { activeStep: steps.length - 1 }
}

export const ThreeSteps: Story = {
  args: {
    steps: steps.slice(0, 3),
    activeStep: 1
  }
}
