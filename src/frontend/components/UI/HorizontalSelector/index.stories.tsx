import type { Meta, StoryObj } from '@storybook/react-vite'
import { MonitorDown, SkipForward } from 'lucide-react'

import HorizontalSelector from '.'
import Icon from '../Icon'

const meta = {
  title: 'Atoms/HorizontalSelector',
  component: HorizontalSelector,
  args: {
    options: [
      {
        icon: <Icon glyph={MonitorDown} size="xl" />,
        title: 'Run installer',
        subtitle:
          'The game comes with an installer I need to run before I can play it',
        onClick: () => {}
      },
      {
        icon: <Icon glyph={SkipForward} size="xl" />,
        title: 'Skip',
        subtitle: 'I already have a game executable I can run to play the game',
        onClick: () => {}
      }
    ]
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '640px' }}>
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof HorizontalSelector>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const ThreeOptions: Story = {
  args: {
    options: [
      {
        icon: <Icon glyph={MonitorDown} size="xl" />,
        title: 'Install',
        subtitle: 'Download and install from the store',
        onClick: () => {}
      },
      {
        icon: <Icon glyph={MonitorDown} size="xl" />,
        title: 'Import',
        subtitle: 'Use an already installed copy on this computer',
        onClick: () => {}
      },
      {
        icon: <Icon glyph={SkipForward} size="xl" />,
        title: 'Skip',
        subtitle: 'Set this up later',
        onClick: () => {}
      }
    ]
  }
}
