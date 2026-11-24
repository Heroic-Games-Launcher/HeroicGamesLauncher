import type { Meta, StoryObj } from '@storybook/react-vite'

import Header from '.'

const meta = {
  title: 'Patterns/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The library header: search on the left, category and library filters on the right.'
      }
    }
  }
} satisfies Meta<typeof Header>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
